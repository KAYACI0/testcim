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

/**
 * Packs question blocks into A4 pages. Each column fills from top to bottom;
 * when the left column is full the right one starts, and when both are full a
 * new page begins. A block taller than a whole column is still placed (alone)
 * so no question is ever dropped.
 */
export function paginate(input: PaginateInput): readonly PaperPage[] {
  const { heights, columns, firstPageHeight, otherPageHeight } = input;
  const pages: number[][][] = [];
  let current: number[][] = Array.from({ length: columns }, () => []);
  let columnIndex = 0;
  let used = 0;
  let capacity = firstPageHeight;

  const startNewPage = () => {
    pages.push(current);
    current = Array.from({ length: columns }, () => []);
    columnIndex = 0;
    used = 0;
    capacity = otherPageHeight;
  };

  heights.forEach((height, index) => {
    const column = current[columnIndex] as number[];
    if (column.length > 0 && used + height > capacity) {
      columnIndex += 1;
      used = 0;
      if (columnIndex >= columns) {
        startNewPage();
      }
    }
    (current[columnIndex] as number[]).push(index);
    used += height;
  });

  pages.push(current);
  return pages.map((pageColumns) => ({ columns: pageColumns }));
}
