import { layoutTest } from '@testcim/layout-engine';

/** A4 at 96 dpi. 1122 px (not 1123) keeps a sheet under 297 mm so print never spills a blank page. */
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1122;
export const PAGE_PADDING = 48;
export const COLUMN_GAP = 32;
/** Space between the page header and the question body, and above the footer. */
export const HEADER_GAP = 24;
export const FOOTER_GAP = 12;
/** Rounding slack so a block never touches the footer. */
export const BODY_SAFETY = 8;

export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING * 2;

export function columnWidth(columns: 1 | 2): number {
  return columns === 2 ? (CONTENT_WIDTH - COLUMN_GAP) / 2 : CONTENT_WIDTH;
}

export interface PaginateInput {
  /** Measured height of each question block, in document order. */
  readonly heights: readonly number[];
  readonly columns: 1 | 2;
  /** Usable body height of the first page (below the full header). */
  readonly firstPageHeight: number;
  /** Usable body height of every following page (below the compact header). */
  readonly otherPageHeight: number;
}

export interface PaperPage {
  /** Item indices per column, top to bottom. Left column fills first, then right. */
  readonly columns: readonly (readonly number[])[];
}

/** The engine refuses bodies and columns narrower than this; the editor never gets close. */
const ENGINE_MIN = 20;

const ITEM_DEFAULTS = {
  sectionId: null,
  groupId: null,
  pinned: false,
  kind: 'rich',
  questionType: 'mcq',
  optionIds: [],
  correct: null,
} as const;

/**
 * Packs question blocks into pages. This is the one layout engine
 * (`@testcim/layout-engine`) in its simplest configuration, strict mode with no gaps,
 * groups or sections; the editor measures heights in the DOM and the engine decides
 * where each block goes, so the algorithm lives in one place. The engine is
 * unit-agnostic, so pixels are passed through as its unit.
 *
 * Each column fills top to bottom; when the left one is full the right one starts,
 * and when both are full a new page begins. A block taller than a whole column is
 * still placed (alone) so no question is ever dropped.
 */
export function paginate(input: PaginateInput): readonly PaperPage[] {
  const { heights, columns } = input;
  const firstCapacity = Math.max(ENGINE_MIN, input.firstPageHeight);
  const otherCapacity = Math.max(ENGINE_MIN, input.otherPageHeight);
  const pageHeight = Math.max(firstCapacity, otherCapacity, 100);

  const { document } = layoutTest({
    items: heights.map((_, index) => ({
      ...ITEM_DEFAULTS,
      id: String(index),
      questionId: String(index),
    })),
    groups: [],
    sections: [],
    settings: {
      pageSize: 'custom',
      orientation: 'portrait',
      customWidthMm: ENGINE_MIN * 3,
      customHeightMm: pageHeight,
      columns,
      marginsMm: { top: 0, bottom: 0, left: 0, right: 0 },
      columnGapMm: 0,
      questionGapMm: 0,
      headerHeightMm: pageHeight - firstCapacity,
      continuationHeaderHeightMm: pageHeight - otherCapacity,
      footerHeightMm: 0,
      mode: 'strict',
      fitPagesScaleMin: 1,
      columnBalance: false,
      lookahead: 0,
    },
    seed: 0,
    versionCode: 'A',
    measure: { item: (id) => heights[Number(id)] ?? 0, passage: () => 0 },
  });

  return document.pages.map((page) => ({
    columns: page.columns.map((column) =>
      column.blocks.flatMap((block) => (block.itemId === null ? [] : [Number(block.itemId)])),
    ),
  }));
}
