export type PageSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'custom';

export type PageOrientation = 'portrait' | 'landscape';

export type LayoutBlockKind = 'item' | 'passage';

/** A positioned block on the page. All coordinates are millimetres from the page origin. */
export interface LayoutBlock {
  readonly kind: LayoutBlockKind;
  /** Null for a group's shared passage. */
  readonly itemId: string | null;
  /** Set on a group's items and on its passage. */
  readonly groupId: string | null;
  /** The number printed next to the question; null for a passage. */
  readonly number: number | null;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** 1 normally; below 1 only in fit-pages mode, where the content is shrunk. */
  readonly scale: number;
}

export interface LayoutColumn {
  readonly index: number;
  readonly blocks: readonly LayoutBlock[];
}

export interface LayoutPage {
  readonly index: number;
  /** The section of the first block on the page, for the section heading. */
  readonly sectionId: string | null;
  readonly columns: readonly LayoutColumn[];
}

export type LayoutWarningCode =
  'fit_pages_target_exceeded' | 'group_does_not_fit_column' | 'item_taller_than_column';

/** Layout never drops content; it reports what it could not do instead. */
export interface LayoutWarning {
  readonly code: LayoutWarningCode;
  readonly message: string;
  readonly itemIds: readonly string[];
}

export type HeaderPreset = 'classic' | 'modern' | 'minimal';

/**
 * Display text only. The caller composes and localizes every string, so neither the
 * engine nor the renderers know a language; they only place and draw what they are given.
 */
export interface LayoutHeader {
  readonly preset: HeaderPreset;
  readonly schoolName: string;
  /** The line under the school name, e.g. term, subject, class and title. */
  readonly metaLine: string;
  /** Short facts such as the teacher and the duration, shown beside or under the meta line. */
  readonly detailLines: readonly string[];
  readonly instructions: string;
  /** Write-in fields the student fills in, as localized labels (name, class and number, score). */
  readonly studentFields: readonly string[];
  /** The one line shown on every page after the first. */
  readonly compactLine: string;
  readonly bookletCode: string | null;
}

export interface LayoutFooter {
  /** Left side, e.g. the product line; empty hides it. */
  readonly brandingLine: string;
  /** Right side with `{page}` and `{total}`, e.g. "Sayfa {page} / {total}"; empty hides it. */
  readonly pageLabel: string;
}

export interface LayoutWatermark {
  readonly text?: string;
  readonly imageAssetId?: string;
  readonly angle: number;
  readonly opacity: number;
}

/**
 * The single source of truth for every output. Preview, PDF, DOCX and PPTX all read
 * this document; layout logic never lives inside a renderer. One document is one
 * booklet version.
 */
export interface LayoutMetrics {
  readonly columns: number;
  readonly marginsMm: {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
  };
  readonly columnGapMm: number;
  readonly questionGapMm: number;
  readonly headerHeightMm: number;
  readonly continuationHeaderHeightMm: number;
  readonly footerHeightMm: number;
}

export interface LayoutDocument {
  readonly pageSize: PageSize;
  readonly orientation: PageOrientation;
  readonly widthMm: number;
  readonly heightMm: number;
  /** The page frame the blocks were placed in; renderers need it for header, footer and dividers. */
  readonly metrics: LayoutMetrics;
  readonly pageColor?: string;
  readonly watermark?: LayoutWatermark;
  readonly header?: LayoutHeader;
  readonly footer?: LayoutFooter;
  readonly pages: readonly LayoutPage[];
  readonly warnings: readonly LayoutWarning[];
}

// ---------------------------------------------------------------------------
// Engine input. Plain data and callbacks only: the engine has no dependency on
// the database, on zod or on the DOM, so it runs in a Worker and in tests alike.
// ---------------------------------------------------------------------------

export type LayoutMode = 'strict' | 'flexible' | 'fit-pages';

export interface LayoutItemInput {
  readonly id: string;
  readonly questionId: string;
  readonly sectionId: string | null;
  readonly groupId: string | null;
  /** A pinned item (or group containing one) keeps its place when booklets are shuffled. */
  readonly pinned: boolean;
  /** Image questions carry their options inside the picture, so only their order can change. */
  readonly kind: 'image' | 'rich';
  readonly questionType: string;
  readonly optionIds: readonly string[];
  /** The answer key as stored; passed through untouched for non-choice types. */
  readonly correct: unknown;
}

export interface LayoutGroupInput {
  readonly id: string;
}

export interface LayoutSectionInput {
  readonly id: string;
  readonly startsNewPage: boolean;
}

export interface LayoutSettingsInput {
  readonly pageSize: PageSize;
  readonly orientation: PageOrientation;
  /** Required when pageSize is 'custom'. */
  readonly customWidthMm?: number;
  readonly customHeightMm?: number;
  readonly columns: 1 | 2 | 3;
  readonly marginsMm: {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
  };
  readonly columnGapMm: number;
  /** Space between blocks in a column; the product rule is at least 3 mm. */
  readonly questionGapMm: number;
  /** Height of the full header on page one, and of the compact one on later pages. */
  readonly headerHeightMm: number;
  readonly continuationHeaderHeightMm: number;
  readonly footerHeightMm: number;
  readonly mode: LayoutMode;
  /** fit-pages: the page count to reach. */
  readonly fitPagesTarget?: number;
  /** fit-pages: the smallest scale allowed (docs/02: 0.85). */
  readonly fitPagesScaleMin: number;
  /** Even out the columns of each page instead of filling the first one completely. */
  readonly columnBalance: boolean;
  /** flexible: how many following questions may jump ahead to fill a gap. */
  readonly lookahead: number;
}

/**
 * Heights come from a callback so the engine stays synchronous and pure. The width is
 * always the column width: an image is scaled to it, so one question has a different
 * height in a one-column and a three-column layout.
 */
export interface LayoutMeasure {
  item(itemId: string, widthMm: number): number;
  passage(groupId: string, widthMm: number): number;
}

export interface LayoutInput {
  /** In the test's own order (`test_items.position`). */
  readonly items: readonly LayoutItemInput[];
  readonly groups: readonly LayoutGroupInput[];
  readonly sections: readonly LayoutSectionInput[];
  readonly settings: LayoutSettingsInput;
  readonly header?: LayoutHeader;
  readonly footer?: LayoutFooter;
  readonly pageColor?: string;
  readonly watermark?: LayoutWatermark;
  /** Base seed of the test; each booklet version derives its own stream from it. */
  readonly seed: number;
  /** 'A' keeps the original order; 'B', 'C', ... are shuffled. */
  readonly versionCode: string;
  readonly measure: LayoutMeasure;
}

export interface BookletOrdering {
  readonly orderedItemIds: readonly string[];
  /**
   * For shuffled choice questions: slot i shows original option index `permutation[i]`.
   * Items that are not shuffled have no entry.
   */
  readonly optionPermutations: Readonly<Record<string, readonly number[]>>;
}

export interface LayoutResult extends BookletOrdering {
  readonly document: LayoutDocument;
}
