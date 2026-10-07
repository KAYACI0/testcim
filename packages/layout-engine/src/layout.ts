import { orderBooklet } from './order';
import { pageDimensions } from './page';
import { mm } from './units';

import type {
  LayoutBlock,
  LayoutColumn,
  LayoutDocument,
  LayoutInput,
  LayoutItemInput,
  LayoutMeasure,
  LayoutPage,
  LayoutResult,
  LayoutWarning,
} from './types';

/** Float slack for "does it fit" checks; coordinates are rounded to 0.001 mm on output. */
const EPSILON = 1e-6;
const MIN_BODY_MM = 20;
const MIN_COLUMN_MM = 20;
const SCALE_STEP = 0.01;

interface BlockSpec {
  readonly kind: 'item' | 'passage';
  readonly itemId: string | null;
  readonly groupId: string | null;
  readonly heightMm: number;
}

/** What moves as one piece: a single question, or a group's passage with its questions. */
interface Unit {
  readonly blocks: readonly BlockSpec[];
  readonly groupId: string | null;
  readonly sectionId: string | null;
  /** The first unit of a section that asks for a new page. */
  readonly startsPage: boolean;
}

interface Metrics {
  readonly columnWidthMm: number;
  readonly gapMm: number;
  readonly columns: number;
  readonly firstCapacityMm: number;
  readonly otherCapacityMm: number;
}

function checkedHeight(value: number, what: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`Measured height for ${what} must be a finite, non-negative number.`);
  }
  return value;
}

function buildUnits(
  ordered: readonly LayoutItemInput[],
  measure: LayoutMeasure,
  columnWidthMm: number,
  startsNewPage: ReadonlyMap<string, boolean>,
): Unit[] {
  const membersByGroup = new Map<string, LayoutItemInput[]>();
  for (const item of ordered) {
    if (item.groupId) {
      const members = membersByGroup.get(item.groupId);
      if (members) members.push(item);
      else membersByGroup.set(item.groupId, [item]);
    }
  }

  const units: Unit[] = [];
  const emittedGroups = new Set<string>();
  const seenSections = new Set<string>();

  for (const item of ordered) {
    if (item.groupId && emittedGroups.has(item.groupId)) continue;

    const sectionKey = item.sectionId ?? '';
    const firstOfSection = !seenSections.has(sectionKey);
    seenSections.add(sectionKey);

    const startsPage =
      firstOfSection &&
      units.length > 0 &&
      item.sectionId !== null &&
      startsNewPage.get(item.sectionId) === true;

    if (item.groupId) {
      emittedGroups.add(item.groupId);
      const members = membersByGroup.get(item.groupId) ?? [item];
      units.push({
        groupId: item.groupId,
        sectionId: item.sectionId,
        startsPage,
        blocks: [
          {
            kind: 'passage',
            itemId: null,
            groupId: item.groupId,
            heightMm: checkedHeight(
              measure.passage(item.groupId, columnWidthMm),
              `group ${item.groupId}`,
            ),
          },
          ...members.map((member): BlockSpec => ({
            kind: 'item',
            itemId: member.id,
            groupId: item.groupId,
            heightMm: checkedHeight(measure.item(member.id, columnWidthMm), `item ${member.id}`),
          })),
        ],
      });
    } else {
      units.push({
        groupId: null,
        sectionId: item.sectionId,
        startsPage,
        blocks: [
          {
            kind: 'item',
            itemId: item.id,
            groupId: null,
            heightMm: checkedHeight(measure.item(item.id, columnWidthMm), `item ${item.id}`),
          },
        ],
      });
    }
  }

  return units;
}

function unitHeight(unit: Unit, scale: number, gapMm: number): number {
  const content = unit.blocks.reduce((total, block) => total + block.heightMm * scale, 0);
  return content + gapMm * (unit.blocks.length - 1);
}

type PagePlan = Unit[][];

function capacityOf(pageIndex: number, metrics: Metrics): number {
  return pageIndex === 0 ? metrics.firstCapacityMm : metrics.otherCapacityMm;
}

/**
 * Packs units column by column, top to bottom, then page by page. A unit that does not
 * fit the rest of a column moves to the next one. A unit taller than a whole column is
 * placed alone rather than dropped. With a lookahead (flexible mode) a later unit of
 * the same section may fill the gap instead.
 */
function fill(
  units: readonly Unit[],
  scale: number,
  metrics: Metrics,
  lookahead: number,
): PagePlan[] {
  const { gapMm, columns } = metrics;
  const pages: PagePlan[] = [];
  const newPage = (): PagePlan => Array.from({ length: columns }, () => [] as Unit[]);

  let page = newPage();
  let columnIndex = 0;
  let used = 0;
  const remaining = [...units];

  const pageHasContent = () => page.some((column) => column.length > 0);
  const startNextPage = () => {
    pages.push(page);
    page = newPage();
    columnIndex = 0;
    used = 0;
  };
  const place = (unit: Unit, height: number) => {
    const column = page[columnIndex] as Unit[];
    used += (column.length > 0 ? gapMm : 0) + height;
    column.push(unit);
  };

  while (remaining.length > 0) {
    const unit = remaining[0] as Unit;

    if (unit.startsPage && pageHasContent()) {
      startNextPage();
    }

    const height = unitHeight(unit, scale, gapMm);
    const capacity = capacityOf(pages.length, metrics);
    const column = page[columnIndex] as Unit[];
    const fits = column.length === 0 || used + gapMm + height <= capacity + EPSILON;

    if (fits) {
      place(unit, height);
      remaining.shift();
      continue;
    }

    if (lookahead > 0) {
      const limit = Math.min(lookahead, remaining.length - 1);
      let found = -1;
      for (let offset = 1; offset <= limit; offset += 1) {
        const candidate = remaining[offset] as Unit;
        if (candidate.sectionId !== unit.sectionId || candidate.startsPage) continue;
        if (used + gapMm + unitHeight(candidate, scale, gapMm) <= capacity + EPSILON) {
          found = offset;
          break;
        }
      }
      if (found > 0) {
        const [candidate] = remaining.splice(found, 1) as [Unit];
        place(candidate, unitHeight(candidate, scale, gapMm));
        continue;
      }
    }

    columnIndex += 1;
    used = 0;
    if (columnIndex >= columns) {
      startNextPage();
    }
  }

  pages.push(page);
  return pages;
}

/**
 * Evens out the columns of one page without changing the order: finds the smallest column
 * height at which the page's units still fit in the available columns.
 */
function balancePage(page: PagePlan, pageIndex: number, scale: number, metrics: Metrics): PagePlan {
  const units = page.flat();
  const { columns, gapMm } = metrics;
  if (columns < 2 || units.length < 2) return page;

  const heights = units.map((unit) => unitHeight(unit, scale, gapMm));
  const tallest = Math.max(...heights);
  const upper = Math.max(capacityOf(pageIndex, metrics), tallest);

  const partition = (limit: number): PagePlan | null => {
    const result: PagePlan = [[]];
    let used = 0;
    for (const [index, unit] of units.entries()) {
      const height = heights[index] as number;
      let column = result[result.length - 1] as Unit[];
      if (column.length > 0 && used + gapMm + height > limit + EPSILON) {
        if (result.length >= columns) return null;
        column = [];
        result.push(column);
        used = 0;
      }
      used += (column.length > 0 ? gapMm : 0) + height;
      column.push(unit);
    }
    return result;
  };

  let low = tallest;
  let high = upper;
  for (let step = 0; step < 40; step += 1) {
    const middle = (low + high) / 2;
    if (partition(middle)) high = middle;
    else low = middle;
  }

  const balanced = partition(high) ?? page;
  return Array.from({ length: columns }, (_, index) => balanced[index] ?? []);
}

/**
 * The one entry point: questions and settings to a `LayoutDocument` for one booklet
 * version. Pure and synchronous; heights come from `input.measure`.
 */
export function layoutTest(input: LayoutInput): LayoutResult {
  const { settings } = input;

  const { widthMm, heightMm } = pageDimensions(settings.pageSize, settings.orientation, {
    widthMm: settings.customWidthMm,
    heightMm: settings.customHeightMm,
  });

  const { top, bottom, left, right } = settings.marginsMm;
  const columns = settings.columns;
  const gapMm = settings.questionGapMm;
  if (gapMm < 0 || settings.columnGapMm < 0) {
    throw new RangeError('Gaps must not be negative.');
  }

  const columnWidthMm = (widthMm - left - right - settings.columnGapMm * (columns - 1)) / columns;
  const firstCapacityMm =
    heightMm - top - bottom - settings.headerHeightMm - settings.footerHeightMm;
  const otherCapacityMm =
    heightMm - top - bottom - settings.continuationHeaderHeightMm - settings.footerHeightMm;

  if (
    columnWidthMm < MIN_COLUMN_MM ||
    firstCapacityMm < MIN_BODY_MM ||
    otherCapacityMm < MIN_BODY_MM
  ) {
    throw new RangeError('Margins, header and footer leave too little room on the page.');
  }

  const metrics: Metrics = { columnWidthMm, gapMm, columns, firstCapacityMm, otherCapacityMm };

  const ordering = orderBooklet({
    items: input.items,
    seed: input.seed,
    versionCode: input.versionCode,
  });

  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const ordered = ordering.orderedItemIds.map((id) => {
    const item = itemById.get(id);
    if (!item) throw new Error(`Ordering produced an unknown item: ${id}`);
    return item;
  });

  const startsNewPage = new Map(
    input.sections.map((section) => [section.id, section.startsNewPage]),
  );
  const units = buildUnits(ordered, input.measure, columnWidthMm, startsNewPage);

  const lookahead = settings.mode === 'flexible' ? Math.max(0, settings.lookahead) : 0;

  let scale = 1;
  let plan = fill(units, scale, metrics, lookahead);
  const warnings: LayoutWarning[] = [];

  if (settings.mode === 'fit-pages' && settings.fitPagesTarget !== undefined) {
    const target = settings.fitPagesTarget;
    const minScale = Math.min(1, Math.max(0, settings.fitPagesScaleMin));
    const steps = Math.floor((1 - minScale) / SCALE_STEP + EPSILON);

    for (let step = 1; plan.length > target && step <= steps + 1; step += 1) {
      scale = step > steps ? minScale : Math.round((1 - step * SCALE_STEP) * 100) / 100;
      plan = fill(units, scale, metrics, lookahead);
    }

    if (plan.length > target) {
      warnings.push({
        code: 'fit_pages_target_exceeded',
        message: `Could not fit ${target} page(s) at scale ${scale}; the test needs ${plan.length}.`,
        itemIds: [],
      });
    }
  }

  if (settings.columnBalance) {
    plan = plan.map((page, pageIndex) => balancePage(page, pageIndex, scale, metrics));
  }

  let number = 0;
  const pages: LayoutPage[] = plan.map((pagePlan, pageIndex) => {
    const bodyTop =
      top + (pageIndex === 0 ? settings.headerHeightMm : settings.continuationHeaderHeightMm);
    const capacity = capacityOf(pageIndex, metrics);

    const layoutColumns: LayoutColumn[] = pagePlan.map((columnUnits, columnIndex) => {
      const x = left + columnIndex * (columnWidthMm + settings.columnGapMm);
      const blocks: LayoutBlock[] = [];
      let y = bodyTop;

      for (const [unitIndex, unit] of columnUnits.entries()) {
        if (unitIndex > 0) y += gapMm;

        if (unitHeight(unit, scale, gapMm) > capacity + EPSILON) {
          const itemIds = unit.blocks.flatMap((block) => (block.itemId ? [block.itemId] : []));
          warnings.push(
            unit.groupId
              ? {
                  code: 'group_does_not_fit_column',
                  message: `Group ${unit.groupId} is taller than a column and was placed alone.`,
                  itemIds,
                }
              : {
                  code: 'item_taller_than_column',
                  message: 'A question is taller than a column and was placed alone.',
                  itemIds,
                },
          );
        }

        for (const [blockIndex, block] of unit.blocks.entries()) {
          if (blockIndex > 0) y += gapMm;
          const height = block.heightMm * scale;
          blocks.push({
            kind: block.kind,
            itemId: block.itemId,
            groupId: block.groupId,
            number: block.kind === 'item' ? ++number : null,
            x: mm(x),
            y: mm(y),
            w: mm(columnWidthMm * scale),
            h: mm(height),
            scale,
          });
          y += height;
        }
      }

      return { index: columnIndex, blocks };
    });

    return {
      index: pageIndex,
      sectionId: pagePlan.flat()[0]?.sectionId ?? null,
      columns: layoutColumns,
    };
  });

  const document: LayoutDocument = {
    pageSize: settings.pageSize,
    orientation: settings.orientation,
    widthMm,
    heightMm,
    metrics: {
      columns,
      marginsMm: settings.marginsMm,
      columnGapMm: settings.columnGapMm,
      questionGapMm: gapMm,
      headerHeightMm: settings.headerHeightMm,
      continuationHeaderHeightMm: settings.continuationHeaderHeightMm,
      footerHeightMm: settings.footerHeightMm,
    },
    ...(input.pageColor !== undefined ? { pageColor: input.pageColor } : {}),
    ...(input.watermark !== undefined ? { watermark: input.watermark } : {}),
    ...(input.header !== undefined ? { header: input.header } : {}),
    ...(input.footer !== undefined ? { footer: input.footer } : {}),
    pages,
    warnings,
  };

  return { document, ...ordering };
}
