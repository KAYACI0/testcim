import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { layoutTest } from './layout';
import { baseSettings, inputOf, item, scenarioArb } from './test-helpers';

import type { LayoutBlock, LayoutDocument } from './types';

const TOLERANCE = 0.002;

function blocksInReadingOrder(document: LayoutDocument): LayoutBlock[] {
  return document.pages.flatMap((page) => page.columns.flatMap((column) => column.blocks));
}

function ids(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `i${index}`);
}

describe('layoutTest basics', () => {
  it('returns one empty page for an empty test', () => {
    const { document } = layoutTest(inputOf({ items: [], heights: new Map() }));
    expect(document.pages).toHaveLength(1);
    expect(document.pages[0]?.columns).toHaveLength(2);
    expect(blocksInReadingOrder(document)).toEqual([]);
  });

  it('fills the left column top to bottom, then the right, then a new page', () => {
    // Body of page 1: 297 - 24 - 40 - 8 = 225 mm; each block 100 mm with a 4 mm gap.
    const items = ids(5).map((id) => item(id));
    const heights = new Map(items.map((i) => [i.id, 100]));
    const { document } = layoutTest(
      inputOf({ items, heights, settings: { columns: 2, questionGapMm: 4 } }),
    );

    const first = document.pages[0]!;
    expect(first.columns[0]?.blocks.map((b) => b.itemId)).toEqual(['i0', 'i1']);
    expect(first.columns[1]?.blocks.map((b) => b.itemId)).toEqual(['i2', 'i3']);
    expect(document.pages[1]?.columns[0]?.blocks.map((b) => b.itemId)).toEqual(['i4']);
  });

  it('places blocks inside the margins, below the header, with the question gap between them', () => {
    const items = ids(2).map((id) => item(id));
    const { document } = layoutTest(
      inputOf({
        items,
        heights: new Map([
          ['i0', 50],
          ['i1', 50],
        ]),
        settings: { columns: 1, questionGapMm: 5 },
      }),
    );
    const [a, b] = blocksInReadingOrder(document);
    expect(a?.x).toBe(12);
    expect(a?.y).toBe(12 + 40);
    expect(b?.y).toBeCloseTo(12 + 40 + 50 + 5, 3);
    expect(a?.w).toBeCloseTo(210 - 24, 3);
  });

  it('uses the compact header height on later pages', () => {
    const items = ids(4).map((id) => item(id));
    const heights = new Map(items.map((i) => [i.id, 200]));
    const { document } = layoutTest(inputOf({ items, heights, settings: { columns: 1 } }));
    expect(document.pages[0]?.columns[0]?.blocks[0]?.y).toBe(52);
    expect(document.pages[1]?.columns[0]?.blocks[0]?.y).toBe(24);
  });

  it('numbers questions in reading order and leaves passages unnumbered', () => {
    const items = [
      item('i0'),
      item('i1', { groupId: 'g0' }),
      item('i2', { groupId: 'g0' }),
      item('i3'),
    ];
    const { document } = layoutTest(inputOf({ items, heights: new Map() }));
    const blocks = blocksInReadingOrder(document);
    expect(blocks.map((b) => [b.kind, b.number])).toEqual([
      ['item', 1],
      ['passage', null],
      ['item', 2],
      ['item', 3],
      ['item', 4],
    ]);
  });

  it('keeps a group together in one column even when it jumps the column', () => {
    const items = [item('i0'), item('i1', { groupId: 'g0' }), item('i2', { groupId: 'g0' })];
    const heights = new Map([
      ['i0', 150],
      ['i1', 60],
      ['i2', 60],
      ['passage:g0', 30],
    ]);
    const { document } = layoutTest(inputOf({ items, heights }));
    expect(document.pages[0]?.columns[0]?.blocks.map((b) => b.itemId)).toEqual(['i0']);
    expect(document.pages[0]?.columns[1]?.blocks.map((b) => b.itemId)).toEqual([null, 'i1', 'i2']);
  });

  it('places a question taller than a column alone and warns instead of dropping it', () => {
    const items = [item('i0'), item('i1')];
    const { document } = layoutTest(
      inputOf({
        items,
        heights: new Map([
          ['i0', 400],
          ['i1', 20],
        ]),
        settings: { columns: 1 },
      }),
    );
    expect(blocksInReadingOrder(document).map((b) => b.itemId)).toEqual(['i0', 'i1']);
    expect(document.warnings.map((w) => w.code)).toEqual(['item_taller_than_column']);
  });

  it('starts a section that asks for it on a fresh page', () => {
    const items = [item('i0', { sectionId: 's0' }), item('i1', { sectionId: 's1' })];
    const { document } = layoutTest(
      inputOf({
        items,
        heights: new Map(),
        sections: [
          { id: 's0', startsNewPage: false },
          { id: 's1', startsNewPage: true },
        ],
      }),
    );
    expect(document.pages).toHaveLength(2);
    expect(document.pages[1]?.sectionId).toBe('s1');
  });

  it('supports landscape, A5 and custom page sizes', () => {
    const items = ids(1).map((id) => item(id));
    const landscape = layoutTest(
      inputOf({ items, heights: new Map(), settings: { orientation: 'landscape' } }),
    ).document;
    expect([landscape.widthMm, landscape.heightMm]).toEqual([297, 210]);

    const custom = layoutTest(
      inputOf({
        items,
        heights: new Map(),
        settings: { pageSize: 'custom', customWidthMm: 200, customHeightMm: 250 },
      }),
    ).document;
    expect([custom.widthMm, custom.heightMm]).toEqual([200, 250]);
  });

  it('rejects settings that leave no room, and bad measurements', () => {
    expect(() =>
      layoutTest(
        inputOf({
          items: [item('i0')],
          heights: new Map(),
          settings: { marginsMm: { top: 140, bottom: 140, left: 10, right: 10 } },
        }),
      ),
    ).toThrow(RangeError);

    const input = inputOf({ items: [item('i0')], heights: new Map() });
    expect(() =>
      layoutTest({ ...input, measure: { item: () => Number.NaN, passage: () => 0 } }),
    ).toThrow(RangeError);
  });
});

describe('layoutTest modes', () => {
  it('flexible fills a gap with a later question that fits, and renumbers by placement', () => {
    const items = [item('i0'), item('i1'), item('i2')];
    const heights = new Map([
      ['i0', 150],
      ['i1', 120],
      ['i2', 60],
    ]);
    const settings = { columns: 1 as const };

    const strict = layoutTest(inputOf({ items, heights, settings })).document;
    expect(blocksInReadingOrder(strict).map((b) => b.itemId)).toEqual(['i0', 'i1', 'i2']);

    const flexible = layoutTest(
      inputOf({ items, heights, settings: { ...settings, mode: 'flexible' } }),
    ).document;
    const placed = blocksInReadingOrder(flexible);
    expect(placed.map((b) => b.itemId)).toEqual(['i0', 'i2', 'i1']);
    expect(placed.map((b) => b.number)).toEqual([1, 2, 3]);
  });

  it('flexible never jumps a question across a section boundary', () => {
    const items = [
      item('i0', { sectionId: 's0' }),
      item('i1', { sectionId: 's0' }),
      item('i2', { sectionId: 's1' }),
    ];
    const heights = new Map([
      ['i0', 150],
      ['i1', 120],
      ['i2', 20],
    ]);
    const { document } = layoutTest(
      inputOf({ items, heights, settings: { columns: 1, mode: 'flexible' } }),
    );
    expect(blocksInReadingOrder(document).map((b) => b.itemId)).toEqual(['i0', 'i1', 'i2']);
  });

  it('balance evens out the columns of the last page', () => {
    const items = ids(4).map((id) => item(id));
    const heights = new Map(items.map((i) => [i.id, 40]));
    const unbalanced = layoutTest(inputOf({ items, heights })).document;
    // 4 x 40 mm + gaps fit one 225 mm column, so the right column stays empty.
    expect(unbalanced.pages[0]?.columns[1]?.blocks).toHaveLength(0);

    const balanced = layoutTest(
      inputOf({ items, heights, settings: { columnBalance: true } }),
    ).document;
    expect(balanced.pages[0]?.columns[0]?.blocks).toHaveLength(2);
    expect(balanced.pages[0]?.columns[1]?.blocks).toHaveLength(2);
    expect(blocksInReadingOrder(balanced).map((b) => b.itemId)).toEqual(['i0', 'i1', 'i2', 'i3']);
  });

  it('fit-pages shrinks content to reach the target page count', () => {
    // Seven 70 mm questions: three fit page one and three more fit page two, so seven
    // need three pages at full size. Two pages are reachable at about 0.87.
    const items = ids(7).map((id) => item(id));
    const heights = new Map(items.map((i) => [i.id, 70]));
    const settings = { columns: 1 as const, mode: 'fit-pages' as const, questionGapMm: 3 };

    const natural = layoutTest(inputOf({ items, heights, settings })).document;
    expect(natural.pages).toHaveLength(3);

    const fitted = layoutTest(
      inputOf({ items, heights, settings: { ...settings, fitPagesTarget: 2 } }),
    ).document;
    const scale = fitted.pages[0]?.columns[0]?.blocks[0]?.scale ?? 1;
    expect(fitted.pages).toHaveLength(2);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThanOrEqual(0.85);
    expect(fitted.warnings).toEqual([]);
  });

  it('fit-pages stops at the minimum scale and warns when the target is out of reach', () => {
    const items = ids(10).map((id) => item(id));
    const heights = new Map(items.map((i) => [i.id, 100]));
    const { document } = layoutTest(
      inputOf({
        items,
        heights,
        settings: { columns: 1, mode: 'fit-pages', fitPagesTarget: 1, fitPagesScaleMin: 0.9 },
      }),
    );
    expect(document.warnings.map((w) => w.code)).toContain('fit_pages_target_exceeded');
    expect(document.pages[0]?.columns[0]?.blocks[0]?.scale).toBe(0.9);
    expect(blocksInReadingOrder(document)).toHaveLength(10);
  });
});

describe('layoutTest properties', () => {
  it('places every question and passage exactly once', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { document } = layoutTest(inputOf(scenario));
        const blocks = blocksInReadingOrder(document);

        const placedItems = blocks.flatMap((b) => (b.itemId ? [b.itemId] : []));
        expect([...placedItems].sort()).toEqual(scenario.items.map((i) => i.id).sort());

        const passages = blocks.filter((b) => b.kind === 'passage').map((b) => b.groupId);
        const groups = [...new Set(scenario.items.flatMap((i) => (i.groupId ? [i.groupId] : [])))];
        expect([...passages].sort()).toEqual([...groups].sort());
      }),
    );
  });

  it('keeps every block inside the page body and the margins', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const input = inputOf(scenario);
        const { document } = layoutTest(input);
        const { marginsMm, headerHeightMm, continuationHeaderHeightMm, footerHeightMm } =
          input.settings;

        document.pages.forEach((page, pageIndex) => {
          const top =
            marginsMm.top + (pageIndex === 0 ? headerHeightMm : continuationHeaderHeightMm);
          const bottom = document.heightMm - marginsMm.bottom - footerHeightMm;

          for (const column of page.columns) {
            const oversize = column.blocks.length === 1;
            for (const block of column.blocks) {
              expect(block.x).toBeGreaterThanOrEqual(marginsMm.left - TOLERANCE);
              expect(block.x + block.w).toBeLessThanOrEqual(
                document.widthMm - marginsMm.right + TOLERANCE,
              );
              expect(block.y).toBeGreaterThanOrEqual(top - TOLERANCE);
              // A lone oversize unit is the one documented exception (it carries a warning).
              if (!oversize) {
                expect(block.y + block.h).toBeLessThanOrEqual(bottom + TOLERANCE);
              }
            }
          }
        });
      }),
    );
  });

  it('never overlaps blocks, within a column or between columns', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const input = inputOf(scenario);
        const { document } = layoutTest(input);

        for (const page of document.pages) {
          for (const column of page.columns) {
            column.blocks.forEach((block, index) => {
              const next = column.blocks[index + 1];
              if (next) {
                expect(next.y).toBeGreaterThanOrEqual(
                  block.y + block.h + input.settings.questionGapMm - TOLERANCE,
                );
              }
            });
          }
          page.columns.forEach((column, index) => {
            const next = page.columns[index + 1];
            const last = column.blocks[0];
            const nextFirst = next?.blocks[0];
            if (last && nextFirst) {
              expect(nextFirst.x).toBeGreaterThanOrEqual(last.x + last.w - TOLERANCE);
            }
          });
        }
      }),
    );
  });

  it('never splits a group across columns unless it is taller than a column', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { document } = layoutTest(inputOf(scenario));
        const oversizeGroups = new Set(
          document.warnings
            .filter((w) => w.code === 'group_does_not_fit_column')
            .flatMap((w) => w.itemIds),
        );

        for (const page of document.pages) {
          for (const column of page.columns) {
            const seen = new Map<string, number>();
            for (const block of column.blocks) {
              if (block.groupId) seen.set(block.groupId, (seen.get(block.groupId) ?? 0) + 1);
            }
            for (const other of document.pages) {
              for (const otherColumn of other.columns) {
                if (otherColumn === column) continue;
                for (const block of otherColumn.blocks) {
                  if (
                    block.groupId &&
                    seen.has(block.groupId) &&
                    !oversizeGroups.has(block.itemId ?? '')
                  ) {
                    throw new Error(`group ${block.groupId} is split across columns`);
                  }
                }
              }
            }
          }
        }
      }),
    );
  });

  it('numbers questions 1..n in reading order', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { document } = layoutTest(inputOf(scenario));
        const numbers = blocksInReadingOrder(document).flatMap((b) =>
          b.number === null ? [] : [b.number],
        );
        expect(numbers).toEqual(numbers.map((_, index) => index + 1));
      }),
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(scenarioArb, fc.constantFrom('A', 'B', 'C'), (scenario, versionCode) => {
        const input = inputOf({ ...scenario, versionCode });
        expect(layoutTest(input)).toEqual(layoutTest(input));
      }),
    );
  });

  it('column balance keeps the order and never makes a page taller', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const plain = layoutTest(
          inputOf({ ...scenario, settings: { ...scenario.settings, columnBalance: false } }),
        ).document;
        const balanced = layoutTest(
          inputOf({ ...scenario, settings: { ...scenario.settings, columnBalance: true } }),
        ).document;

        expect(balanced.pages).toHaveLength(plain.pages.length);
        expect(blocksInReadingOrder(balanced).map((b) => b.itemId)).toEqual(
          blocksInReadingOrder(plain).map((b) => b.itemId),
        );

        const tallest = (document: LayoutDocument, pageIndex: number) =>
          Math.max(
            0,
            ...(document.pages[pageIndex]?.columns ?? []).map((column) => {
              const last = column.blocks[column.blocks.length - 1];
              return last ? last.y + last.h : 0;
            }),
          );
        balanced.pages.forEach((_, pageIndex) => {
          expect(tallest(balanced, pageIndex)).toBeLessThanOrEqual(
            tallest(plain, pageIndex) + TOLERANCE,
          );
        });
      }),
    );
  });

  it('starts a new-page section at the top of a page', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { document } = layoutTest(inputOf(scenario));
        const startsNew = new Set(
          scenario.sections.filter((s) => s.startsNewPage).map((s) => s.id),
        );
        const firstItemOfSection = new Map<string, string>();
        for (const entry of scenario.items) {
          if (entry.sectionId && !firstItemOfSection.has(entry.sectionId)) {
            firstItemOfSection.set(
              entry.sectionId,
              entry.groupId ? `passage:${entry.groupId}` : entry.id,
            );
          }
        }
        const firstOverall = scenario.items[0]?.sectionId;
        void firstOverall;

        for (const sectionId of startsNew) {
          const marker = firstItemOfSection.get(sectionId);
          if (!marker) continue;
          const blocks = document.pages.flatMap((page) =>
            page.columns.flatMap((column) =>
              column.blocks.map((block) => ({ page: page.index, column, block })),
            ),
          );
          const target = blocks.find(({ block }) =>
            marker.startsWith('passage:')
              ? block.kind === 'passage' && block.groupId === marker.slice(8)
              : block.itemId === marker,
          );
          if (!target) continue;
          const pageFirstColumn = document.pages[target.page]?.columns.find(
            (c) => c.blocks.length > 0,
          );
          expect(pageFirstColumn?.blocks[0]).toBe(target.block);
        }
      }),
    );
  });

  it('fit-pages never goes below the minimum scale and warns whenever it misses the target', () => {
    fc.assert(
      fc.property(
        scenarioArb,
        fc.integer({ min: 1, max: 4 }),
        fc.double({ min: 0.85, max: 1, noNaN: true }),
        (scenario, target, minScale) => {
          const { document } = layoutTest(
            inputOf({
              ...scenario,
              settings: {
                ...scenario.settings,
                mode: 'fit-pages',
                fitPagesTarget: target,
                fitPagesScaleMin: minScale,
              },
            }),
          );
          for (const block of blocksInReadingOrder(document)) {
            expect(block.scale).toBeGreaterThanOrEqual(minScale - TOLERANCE);
            expect(block.scale).toBeLessThanOrEqual(1);
          }
          const missed = document.pages.length > target;
          const warned = document.warnings.some((w) => w.code === 'fit_pages_target_exceeded');
          expect(warned).toBe(missed);
        },
      ),
    );
  });
});

describe('layoutTest performance', () => {
  it('lays out 100 questions in 3 columns with every option on well under a second', () => {
    const items = Array.from({ length: 100 }, (_, index) =>
      item(`i${index}`, {
        sectionId: `s${index % 3}`,
        groupId: index % 10 < 3 ? `g${Math.floor(index / 10)}` : null,
      }),
    );
    const heights = new Map(items.map((entry, index) => [entry.id, 20 + (index % 7) * 9]));
    const input = inputOf({
      items,
      heights,
      versionCode: 'C',
      settings: { ...baseSettings, columns: 3, mode: 'flexible', columnBalance: true },
    });

    const started = performance.now();
    layoutTest(input);
    const elapsed = performance.now() - started;

    // The product target is 100 ms; the ceiling is loose so a busy CI runner does not flake.
    expect(elapsed).toBeLessThan(300);
  });
});
