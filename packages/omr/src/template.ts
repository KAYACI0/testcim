import { bubbleGrid, type BubbleCell } from './geometry';

/** A4 in millimetres. Multi-page forms reuse this for every page. */
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

/**
 * Every other template element starts at MARGIN_MM from an edge. CORNER_SEARCH_MM
 * (used by the reader to locate corner marks) must stay strictly inside that so the
 * search region never picks up header text or bubbles instead of the mark.
 */
export const MARGIN_MM = 16;
export const CORNER_INSET_MM = 5;
export const CORNER_SIZE_MM = 8;
export const CORNER_SEARCH_MM = 15;

export const BUBBLE_DIAMETER_MM = 4;

const ROW_PITCH_MM = 6;
const OPTION_PITCH_MM = 7;
const ROWS_PER_GROUP = 5;
const GROUP_GAP_MM = 2.5;
const HEADER_RESERVED_MM = 60;
const FOOTER_RESERVED_MM = 12;
const QR_SIZE_MM = 18;
const ANSWERS_ORIGIN_X_MM = MARGIN_MM + 12;
const STUDENT_NUMBER_ORIGIN_X_MM = 110;
const STUDENT_NUMBER_ORIGIN_Y_MM = MARGIN_MM + 4;
const BOOKLET_CODE_ORIGIN_Y_MM = MARGIN_MM + 40;

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export interface OmrCornerMark {
  readonly id: 'tl' | 'tr' | 'bl' | 'br';
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface OmrQrSlot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface OmrTextField {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A single markable bubble. `question` groups bubbles that are mutually exclusive
 * choices of one thing: for answers it's the question number, for the student number
 * grid it's the digit position (0-based, left to right), for the booklet code grid it's
 * always 0 (one group). `option` is the printed label (an answer letter or a digit).
 */
export interface OmrAnswerBubble extends BubbleCell {
  readonly question: number;
  readonly option: string;
}

export interface OmrPageTemplate {
  readonly pageIndex: number;
  readonly corners: readonly [OmrCornerMark, OmrCornerMark, OmrCornerMark, OmrCornerMark];
  readonly qr: OmrQrSlot;
  readonly nameField: OmrTextField | null;
  readonly classField: OmrTextField | null;
  readonly studentNumber: readonly OmrAnswerBubble[] | null;
  readonly bookletCode: readonly OmrAnswerBubble[] | null;
  readonly answers: readonly OmrAnswerBubble[];
}

export interface OmrFormTemplate {
  readonly version: number;
  readonly pageWidthMm: number;
  readonly pageHeightMm: number;
  readonly questionCount: number;
  readonly optionCount: number;
  readonly studentNumberDigits: number;
  readonly bookletCodes: readonly string[];
  readonly pages: readonly OmrPageTemplate[];
}

export interface BuildOmrTemplateOptions {
  readonly questionCount: number;
  /** 2-5 (A-E). Default 4. */
  readonly optionCount?: number;
  readonly studentNumberDigits?: number;
  /** Empty array disables the booklet-code grid. Default ['A', 'B']. */
  readonly bookletCodes?: readonly string[];
}

function cornerMarks(): readonly [OmrCornerMark, OmrCornerMark, OmrCornerMark, OmrCornerMark] {
  const farX = PAGE_WIDTH_MM - CORNER_INSET_MM - CORNER_SIZE_MM;
  const farY = PAGE_HEIGHT_MM - CORNER_INSET_MM - CORNER_SIZE_MM;
  return [
    { id: 'tl', x: CORNER_INSET_MM, y: CORNER_INSET_MM, size: CORNER_SIZE_MM },
    { id: 'tr', x: farX, y: CORNER_INSET_MM, size: CORNER_SIZE_MM },
    { id: 'bl', x: CORNER_INSET_MM, y: farY, size: CORNER_SIZE_MM },
    { id: 'br', x: farX, y: farY, size: CORNER_SIZE_MM },
  ];
}

/** Row y-offset from a section origin, inserting a small gap every 5 rows (docs/prompts/10). */
function rowY(rowIndex: number, originY: number): number {
  return originY + rowIndex * ROW_PITCH_MM + Math.floor(rowIndex / ROWS_PER_GROUP) * GROUP_GAP_MM;
}

function maxRowsForHeight(availableHeightMm: number): number {
  let rows = 0;
  while (rowY(rows, 0) + BUBBLE_DIAMETER_MM <= availableHeightMm) {
    rows += 1;
  }
  return rows;
}

function answerRows(
  optionCount: number,
  startQuestion: number,
  rowCount: number,
  originX: number,
  originY: number,
): OmrAnswerBubble[] {
  const bubbles: OmrAnswerBubble[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    const question = startQuestion + row;
    const y = rowY(row, originY);
    for (let column = 0; column < optionCount; column += 1) {
      bubbles.push({
        row,
        column,
        x: originX + column * OPTION_PITCH_MM,
        y,
        diameter: BUBBLE_DIAMETER_MM,
        question,
        option: OPTION_LETTERS[column]!,
      });
    }
  }
  return bubbles;
}

function studentNumberBubbles(digits: number): OmrAnswerBubble[] {
  return bubbleGrid({
    rows: 10,
    columns: digits,
    originX: STUDENT_NUMBER_ORIGIN_X_MM,
    originY: STUDENT_NUMBER_ORIGIN_Y_MM,
    pitchX: OPTION_PITCH_MM,
    pitchY: ROW_PITCH_MM,
    diameter: BUBBLE_DIAMETER_MM,
  }).map((cell) => ({ ...cell, question: cell.column, option: String(cell.row) }));
}

function bookletCodeBubbles(codes: readonly string[]): OmrAnswerBubble[] {
  return codes.map((code, index) => ({
    row: 0,
    column: index,
    x: MARGIN_MM + index * OPTION_PITCH_MM,
    y: BOOKLET_CODE_ORIGIN_Y_MM,
    diameter: BUBBLE_DIAMETER_MM,
    question: 0,
    option: code,
  }));
}

/**
 * Lays out a Testcim OMR form: corner marks, optional student-number and booklet-code
 * grids and a name/class box on page 1, and the answer grid spilling onto as many
 * further pages as needed. The reader is handed the exact same template, so geometry
 * decided here is the only geometry that ever exists for a given form.
 */
export function buildOmrTemplate(options: BuildOmrTemplateOptions): OmrFormTemplate {
  const { questionCount } = options;
  const optionCount = options.optionCount ?? 4;
  const studentNumberDigits = options.studentNumberDigits ?? 10;
  const bookletCodes = options.bookletCodes ?? ['A', 'B'];

  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 200) {
    throw new RangeError('questionCount must be an integer between 1 and 200.');
  }
  if (!Number.isInteger(optionCount) || optionCount < 2 || optionCount > OPTION_LETTERS.length) {
    throw new RangeError(`optionCount must be an integer between 2 and ${OPTION_LETTERS.length}.`);
  }
  if (
    !Number.isInteger(studentNumberDigits) ||
    studentNumberDigits < 0 ||
    studentNumberDigits > 15
  ) {
    throw new RangeError('studentNumberDigits must be an integer between 0 and 15.');
  }

  const bodyTop = MARGIN_MM;
  const bodyBottom = PAGE_HEIGHT_MM - MARGIN_MM - FOOTER_RESERVED_MM;
  const firstPageAnswersTop = bodyTop + HEADER_RESERVED_MM;
  const firstPageRowCapacity = maxRowsForHeight(bodyBottom - firstPageAnswersTop);
  const laterPageRowCapacity = maxRowsForHeight(bodyBottom - bodyTop);

  if (firstPageRowCapacity <= 0 || laterPageRowCapacity <= 0) {
    throw new RangeError('Page is too small to fit any answer rows.');
  }

  const pages: OmrPageTemplate[] = [];
  let remaining = questionCount;
  let nextQuestion = 1;
  let pageIndex = 0;

  while (remaining > 0) {
    const isFirstPage = pageIndex === 0;
    const capacity = isFirstPage ? firstPageRowCapacity : laterPageRowCapacity;
    const rowsOnPage = Math.min(capacity, remaining);
    const originY = isFirstPage ? firstPageAnswersTop : bodyTop;

    pages.push({
      pageIndex,
      corners: cornerMarks(),
      qr: { x: PAGE_WIDTH_MM - MARGIN_MM - QR_SIZE_MM, y: MARGIN_MM, size: QR_SIZE_MM },
      nameField: isFirstPage ? { x: MARGIN_MM, y: bodyTop + 4, width: 90, height: 10 } : null,
      classField: isFirstPage ? { x: MARGIN_MM, y: bodyTop + 18, width: 40, height: 10 } : null,
      studentNumber:
        isFirstPage && studentNumberDigits > 0 ? studentNumberBubbles(studentNumberDigits) : null,
      bookletCode: isFirstPage && bookletCodes.length > 0 ? bookletCodeBubbles(bookletCodes) : null,
      answers: answerRows(optionCount, nextQuestion, rowsOnPage, ANSWERS_ORIGIN_X_MM, originY),
    });

    nextQuestion += rowsOnPage;
    remaining -= rowsOnPage;
    pageIndex += 1;
  }

  return {
    version: 1,
    pageWidthMm: PAGE_WIDTH_MM,
    pageHeightMm: PAGE_HEIGHT_MM,
    questionCount,
    optionCount,
    studentNumberDigits,
    bookletCodes,
    pages,
  };
}
