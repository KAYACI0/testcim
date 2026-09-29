export type PageSize = 'A4' | 'A5' | 'Letter';

export type PageOrientation = 'portrait' | 'landscape';

/** A positioned item on the page. All coordinates are millimetres from the page origin. */
export interface LayoutBlock {
  readonly itemId: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface LayoutColumn {
  readonly index: number;
  readonly blocks: readonly LayoutBlock[];
}

export interface LayoutPage {
  readonly index: number;
  readonly columns: readonly LayoutColumn[];
}

/**
 * The single source of truth for every output. Preview, PDF, DOCX and PPTX all read
 * this document; layout logic never lives inside a renderer.
 */
export interface LayoutDocument {
  readonly pageSize: PageSize;
  readonly orientation: PageOrientation;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly pages: readonly LayoutPage[];
}
