import {
  layoutTest,
  type LayoutHeader,
  type LayoutItemInput,
  type LayoutDocument,
} from '@testcim/layout-engine';
import type { TextMeasure } from '@testcim/pdf-fonts';
import {
  frameMetrics,
  paintTest,
  questionImageHeightMm,
  type PaintExtra,
  type PaintPage,
  type TestPaintContent,
} from '@testcim/renderers/paint';
import type { AnswerKey, TestHeaderSettings, TestSettings } from '@testcim/shared';

export type QuestionSpacing = NonNullable<TestHeaderSettings['questionSpacing']>;

/** The space between questions for each spacing choice. The product floor is 3 mm. */
export const QUESTION_GAP_MM: Readonly<Record<QuestionSpacing, number>> = {
  tight: 3,
  normal: 5.3,
  wide: 8.5,
  detailed: 17,
};

const PAGE_WIDTH_MM = 210;
const MARGIN_MM = 12;
const COLUMN_GAP_MM = 8;
const NUMBER_GUTTER_MM = 8;
const POINTS_GUTTER_MM = 16;
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/** Shown until an image's real size is known, so the first paint is already close. */
const FALLBACK_SIZE = { width: 800, height: 300 } as const;

export const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;

/** Every user-facing string the paper prints; the caller supplies the localized text. */
export interface PaperLabels {
  readonly defaultSchool: string;
  readonly defaultSubject: string;
  readonly defaultClass: string;
  readonly defaultTerm: string;
  readonly defaultTitle: string;
  readonly studentName: string;
  readonly classAndNo: string;
  readonly score: string;
  readonly teacher: string;
  readonly duration: string;
  readonly durationMinutes: (minutes: string) => string;
  readonly subjectLine: (subject: string) => string;
  readonly classLine: (className: string) => string;
  readonly pointsSuffix: string;
  readonly answerSheetTitle: string;
  readonly answerKeyTitle: string;
  readonly footerBrand: string;
  /** With `{page}` and `{total}` left in place for the renderer to fill. */
  readonly pageLabel: string;
}

export interface PaperItem {
  readonly id: string;
  readonly imageUrl: string;
  readonly points: number | null;
  readonly correct: AnswerKey | null;
}

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

export interface PaperLayoutInput {
  readonly items: readonly PaperItem[];
  /** Natural image sizes keyed by image URL; missing ones fall back to a typical shape. */
  readonly sizes: ReadonlyMap<string, ImageSize>;
  readonly header: TestHeaderSettings;
  readonly title: string;
  readonly settings: Pick<
    TestSettings,
    'columns' | 'layoutMode' | 'fitPagesTarget' | 'fitPagesScaleMin'
  > | null;
  readonly labels: PaperLabels;
  readonly measure: TextMeasure;
}

export interface PaperLayout {
  readonly document: LayoutDocument;
  readonly pages: readonly PaintPage[];
  /** How many of the pages hold questions; the rest are the answer sheet and key. */
  readonly questionPageCount: number;
  /** Questions on each question page. */
  readonly questionCounts: readonly number[];
  readonly columns: 1 | 2 | 3;
}

/** Composes the header text the way the paper has always read: term, subject, class, title. */
export function buildLayoutHeader(
  header: TestHeaderSettings,
  title: string,
  labels: PaperLabels,
): LayoutHeader {
  const preset = header.layoutPreset ?? 'classic';
  const examTitle = header.title || title || labels.defaultTitle;

  const metaLine = [
    preset === 'classic' ? header.term || labels.defaultTerm : '',
    header.subject ? labels.subjectLine(header.subject) : labels.defaultSubject,
    header.className ? labels.classLine(header.className) : labels.defaultClass,
    examTitle,
  ]
    .filter(Boolean)
    .join(' - ');

  const detailLines = [
    header.teacherName ? `${labels.teacher}: ${header.teacherName}` : '',
    header.duration ? `${labels.duration}: ${labels.durationMinutes(header.duration)}` : '',
  ].filter(Boolean);

  const showStudent = header.showStudentInfo !== false;
  const studentFields = showStudent
    ? [
        header.showStudentName !== false ? labels.studentName : '',
        header.showStudentNo !== false || header.showClass !== false ? labels.classAndNo : '',
        header.showScore !== false ? labels.score : '',
      ].filter(Boolean)
    : [];

  return {
    preset,
    schoolName: header.schoolName || labels.defaultSchool,
    metaLine,
    detailLines,
    instructions: header.instructions ?? '',
    studentFields,
    compactLine: [header.subject, header.className, header.title || title]
      .filter(Boolean)
      .join(' - '),
    bookletCode: header.showBookletCode ? (header.bookletCode ?? 'A') : null,
  };
}

function answerLetter(correct: AnswerKey | null): string {
  return correct?.question_type === 'mcq' ? correct.option_id : '-';
}

/**
 * The editor's whole paper pipeline in one pure function: items and settings in, paint
 * pages out. The same pages feed the on-screen preview, the print copy and the PDF, so
 * there is exactly one place that decides where a question goes.
 */
export function buildPaperLayout(input: PaperLayoutInput): PaperLayout {
  const { items, sizes, header, title, settings, labels, measure } = input;

  const columns: 1 | 2 | 3 = settings?.columns === 1 ? 1 : settings?.columns === 3 ? 3 : 2;
  const gapMm = QUESTION_GAP_MM[header.questionSpacing ?? 'normal'];
  const columnWidthMm = (CONTENT_WIDTH_MM - COLUMN_GAP_MM * (columns - 1)) / columns;

  const hasPoints = items.some((item) => item.points);
  const gutters = {
    numberGutterMm: NUMBER_GUTTER_MM,
    pointsGutterMm: hasPoints ? POINTS_GUTTER_MM : 0,
  };

  const layoutHeader = buildLayoutHeader(header, title, labels);
  const layoutFooter = { brandingLine: labels.footerBrand, pageLabel: labels.pageLabel };
  const frame = frameMetrics(layoutHeader, layoutFooter, CONTENT_WIDTH_MM, measure);

  const sizeOf = (item: PaperItem): ImageSize => sizes.get(item.imageUrl) ?? FALLBACK_SIZE;
  const byId = new Map(items.map((item) => [item.id, item]));

  const layoutItems: LayoutItemInput[] = items.map((item) => ({
    id: item.id,
    questionId: item.id,
    sectionId: null,
    groupId: null,
    pinned: false,
    kind: 'image',
    questionType: item.correct?.question_type ?? 'mcq',
    optionIds: [],
    correct: item.correct,
  }));

  const mode = settings?.layoutMode ?? 'strict';
  const { document } = layoutTest({
    items: layoutItems,
    groups: [],
    sections: [],
    header: layoutHeader,
    footer: layoutFooter,
    settings: {
      pageSize: 'A4',
      orientation: 'portrait',
      columns,
      marginsMm: { top: MARGIN_MM, bottom: MARGIN_MM, left: MARGIN_MM, right: MARGIN_MM },
      columnGapMm: COLUMN_GAP_MM,
      questionGapMm: gapMm,
      ...frame,
      mode,
      ...(settings?.fitPagesTarget !== undefined
        ? { fitPagesTarget: settings.fitPagesTarget }
        : {}),
      fitPagesScaleMin: settings?.fitPagesScaleMin ?? 0.85,
      columnBalance: false,
      lookahead: 3,
    },
    seed: 0,
    versionCode: 'A',
    measure: {
      item: (id) => {
        const item = byId.get(id);
        const size = item ? sizeOf(item) : FALLBACK_SIZE;
        return questionImageHeightMm(columnWidthMm, gutters, size.width, size.height);
      },
      passage: () => 0,
    },
  });

  const extras: PaintExtra[] = [];
  if (items.length > 0 && header.showAnswerSheet === true) {
    extras.push({
      kind: 'answerSheet',
      title: labels.answerSheetTitle,
      optionLetters: OPTION_LETTERS,
      count: items.length,
    });
  }
  if (items.length > 0 && header.showAnswerKey === true) {
    extras.push({
      kind: 'answerKey',
      title: labels.answerKeyTitle,
      answers: items.map((item) => answerLetter(item.correct)),
    });
  }

  const content: TestPaintContent = {
    measure,
    ...gutters,
    pointsLabels: new Map(
      items.flatMap((item) =>
        item.points ? [[item.id, `(${item.points} ${labels.pointsSuffix})`] as const] : [],
      ),
    ),
    imageKeys: new Set(items.filter((item) => item.imageUrl).map((item) => item.id)),
    showColumnDivider: header.showColumnDivider !== false,
    extras,
  };

  return {
    document,
    pages: paintTest(document, content),
    questionPageCount: document.pages.length,
    questionCounts: document.pages.map((page) =>
      page.columns.reduce(
        (sum, column) => sum + column.blocks.filter((block) => block.kind === 'item').length,
        0,
      ),
    ),
    columns,
  };
}
