import { PDFDocument, StandardFonts } from 'pdf-lib';

import { drawTiledWatermark, type WatermarkOptions } from './watermark';

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH_PT = 210 * MM_TO_PT;
const A4_HEIGHT_PT = 297 * MM_TO_PT;
const MARGIN_PT = 20 * MM_TO_PT;

export interface ReportCardScoreRow {
  readonly label: string;
  readonly score: number;
  readonly maxScore: number;
  readonly date: string;
}

export interface ReportCardOutcomeRow {
  readonly outcomeLabel: string;
  readonly correctCount: number;
  readonly totalCount: number;
}

export interface ReportCardData {
  readonly studentName: string;
  readonly studentNo: string | null;
  readonly className: string;
  /** Localized labels supplied by the caller — this package has no i18n dependency. */
  readonly labels: {
    readonly title: string;
    readonly studentNoLabel: string;
    readonly classLabel: string;
    readonly scoresTitle: string;
    readonly outcomesTitle: string;
    readonly summaryTitle: string;
    readonly scoreColumn: string;
    readonly dateColumn: string;
  };
  readonly scores: readonly ReportCardScoreRow[];
  readonly outcomes: readonly ReportCardOutcomeRow[];
  /** Only an `approved` AI summary reaches this renderer — enforced by the caller. */
  readonly summaryText?: string;
  readonly watermark?: WatermarkOptions;
}

/**
 * Renders a single-column, one-or-more-page report card (karne). This is a
 * report/invoice-style generator, not the Prompt 05 general question-layout
 * engine — it never reads `LayoutDocument`.
 *
 * Uses pdf-lib's built-in WinAnsi Helvetica, same as
 * `packages/omr/src/pdf.ts`, and inherits its known gap: ı/İ/ğ/Ğ/ş/Ş cannot be
 * encoded and are dropped/mangled. Unlike the OMR form (mostly numbers and
 * bubbles), a report card's student/class names are real Turkish text, so
 * this is a materially worse instance of the same tracked gap — see
 * docs/backlog.md.
 */
export async function renderReportCardPdf(data: ReportCardData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  let cursorY = A4_HEIGHT_PT - MARGIN_PT;
  const contentWidth = A4_WIDTH_PT - MARGIN_PT * 2;

  function ensureSpace(neededPt: number): void {
    if (cursorY - neededPt < MARGIN_PT) {
      page = doc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
      cursorY = A4_HEIGHT_PT - MARGIN_PT;
    }
  }

  function drawLine(text: string, size: number, useBold = false, gapAfter = 4): void {
    ensureSpace(size + gapAfter);
    page.drawText(text, {
      x: MARGIN_PT,
      y: cursorY - size,
      size,
      font: useBold ? boldFont : font,
    });
    cursorY -= size + gapAfter;
  }

  drawLine(data.labels.title, 18, true, 14);
  drawLine(`${data.labels.classLabel}: ${data.className}`, 11);
  drawLine(
    `${data.studentName}${data.studentNo ? ` (${data.labels.studentNoLabel}: ${data.studentNo})` : ''}`,
    11,
    false,
    16,
  );

  if (data.scores.length > 0) {
    drawLine(data.labels.scoresTitle, 13, true, 8);
    const col1 = MARGIN_PT;
    const col2 = MARGIN_PT + contentWidth * 0.55;
    const col3 = MARGIN_PT + contentWidth * 0.8;
    ensureSpace(10 + 6);
    page.drawText(data.labels.scoreColumn, { x: col2, y: cursorY - 10, size: 9, font: boldFont });
    page.drawText(data.labels.dateColumn, { x: col3, y: cursorY - 10, size: 9, font: boldFont });
    cursorY -= 10 + 6;
    for (const row of data.scores) {
      ensureSpace(11 + 4);
      page.drawText(row.label, {
        x: col1,
        y: cursorY - 11,
        size: 10,
        font,
        maxWidth: contentWidth * 0.5,
      });
      page.drawText(`${row.score}/${row.maxScore}`, { x: col2, y: cursorY - 11, size: 10, font });
      page.drawText(row.date, { x: col3, y: cursorY - 11, size: 10, font });
      cursorY -= 11 + 4;
    }
    cursorY -= 8;
  }

  if (data.outcomes.length > 0) {
    drawLine(data.labels.outcomesTitle, 13, true, 8);
    for (const outcome of data.outcomes) {
      const pct =
        outcome.totalCount === 0
          ? 0
          : Math.round((outcome.correctCount / outcome.totalCount) * 100);
      drawLine(
        `${outcome.outcomeLabel}: ${outcome.correctCount}/${outcome.totalCount} (%${pct})`,
        10,
        false,
        5,
      );
    }
    cursorY -= 8;
  }

  if (data.summaryText) {
    drawLine(data.labels.summaryTitle, 13, true, 8);
    const words = data.summaryText.split(/\s+/);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 10) > contentWidth) {
        drawLine(line, 10, false, 3);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) drawLine(line, 10, false, 3);
  }

  if (data.watermark) {
    for (const p of doc.getPages()) {
      drawTiledWatermark(p, data.watermark, font);
    }
  }

  return doc.save();
}
