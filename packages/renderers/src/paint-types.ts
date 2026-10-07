import type { LayoutDocument } from '@testcim/layout-engine';
import type { PdfFontWeight, TextMeasure } from '@testcim/pdf-fonts';

/**
 * Colours are design tokens, never values. The HTML renderer maps them to the web
 * app's CSS variables and the PDF renderer to the same palette as RGB numbers.
 */
export type PaintColor = 'surface' | 'ink' | 'ink2' | 'ink3' | 'line' | 'lineStrong' | 'accent';

/**
 * The intermediate form between layout and output. Layout becomes a flat list of
 * primitives per page; the HTML preview and the PDF both draw exactly this list, so what
 * is on screen and what is printed cannot drift apart. Units are millimetres from the
 * top-left corner of the page.
 */
export type PaintCommand =
  | {
      readonly type: 'text';
      /** Left edge of the box the text is aligned inside. */
      readonly x: number;
      /** Top of the line box; the baseline sits 1.025 em lower. */
      readonly y: number;
      readonly w: number;
      readonly text: string;
      readonly sizePt: number;
      readonly weight: PdfFontWeight;
      readonly align: 'left' | 'center' | 'right';
      readonly color: PaintColor;
      /** Counter-clockwise degrees around the left end of the baseline. */
      readonly rotateDeg?: number;
      readonly opacity?: number;
    }
  | {
      readonly type: 'line';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly widthMm: number;
      readonly color: PaintColor;
      readonly dotted?: boolean;
    }
  | {
      readonly type: 'rect';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly strokeMm: number;
      readonly stroke: PaintColor | null;
      readonly fill: PaintColor | null;
    }
  | {
      readonly type: 'image';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      /** What the caller maps to image bytes (PDF) or a URL (HTML): an item or passage key. */
      readonly key: string;
    };

export type PaintPageTag = 'questions' | 'answerSheet' | 'answerKey';

export interface PaintPage {
  /** What the page holds, so a viewer can find the answer key without counting pages. */
  readonly tag: PaintPageTag;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly commands: readonly PaintCommand[];
}

export type PaintExtra =
  | {
      readonly kind: 'answerSheet';
      readonly title: string;
      /** The letters to bubble, e.g. A to E. */
      readonly optionLetters: readonly string[];
      readonly count: number;
    }
  | {
      readonly kind: 'answerKey';
      readonly title: string;
      /** One letter per question, in number order. */
      readonly answers: readonly string[];
    };

export interface TestPaintContent {
  readonly measure: TextMeasure;
  /** Where the question number sits, left of the question image. */
  readonly numberGutterMm: number;
  /** Set aside on the right of every block when any question shows its points. */
  readonly pointsGutterMm: number;
  /** itemId -> the points label to print, e.g. "2 puan". */
  readonly pointsLabels: ReadonlyMap<string, string>;
  /** Items that have an image; others are drawn as an empty frame. */
  readonly imageKeys: ReadonlySet<string>;
  readonly showColumnDivider: boolean;
  readonly extras: readonly PaintExtra[];
}

export type PaintDocument = Pick<
  LayoutDocument,
  'widthMm' | 'heightMm' | 'metrics' | 'pages' | 'header' | 'footer' | 'watermark' | 'pageColor'
>;
