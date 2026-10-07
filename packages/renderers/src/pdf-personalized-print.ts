import { PDFDocument } from 'pdf-lib';

import { embedPdfFonts, type PdfFontBytes } from '@testcim/pdf-fonts';

import { drawTiledWatermark, type WatermarkOptions } from './watermark';

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH_PT = 210 * MM_TO_PT;
const A4_HEIGHT_PT = 297 * MM_TO_PT;
const MARGIN_PT = 20 * MM_TO_PT;

export interface PersonalizedCoverMeta {
  readonly studentName: string;
  readonly studentNo: string | null;
  readonly className: string;
  readonly testTitle: string;
  readonly labels: {
    readonly studentNoLabel: string;
    readonly classLabel: string;
  };
}

export interface PersonalizedPrintOptions {
  readonly cover: PersonalizedCoverMeta;
  readonly watermark?: WatermarkOptions;
}

/**
 * Prepends a name/QR-placeholder cover page to an existing exam PDF and
 * tiles a watermark across every page (cover included).
 *
 * `docs/prompts/12` §5 reads as "kişiye özel baskı" for each student; taken
 * literally that could mean re-flowing the entire question paper per
 * student, which needs the Prompt 05 general layout engine (not built — see
 * the render-engine scope note in this PR's description). This function
 * instead adds a per-student cover/identification page in front of the
 * already-rendered exam PDF (Prompt 05/09 output) — the interpretation
 * agreed with the user before this PR was written.
 */
export async function addPersonalizedCoverPage(
  basePdfBytes: Uint8Array,
  options: PersonalizedPrintOptions,
  fontBytes: PdfFontBytes,
): Promise<Uint8Array> {
  const baseDoc = await PDFDocument.load(basePdfBytes);
  const outDoc = await PDFDocument.create();
  const { regular: font, semibold: boldFont } = await embedPdfFonts(outDoc, fontBytes);

  const cover = outDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  let cursorY = A4_HEIGHT_PT - MARGIN_PT * 2;

  cover.drawText(options.cover.testTitle, { x: MARGIN_PT, y: cursorY, size: 18, font: boldFont });
  cursorY -= 30;
  cover.drawText(`${options.cover.labels.classLabel}: ${options.cover.className}`, {
    x: MARGIN_PT,
    y: cursorY,
    size: 12,
    font,
  });
  cursorY -= 20;
  const studentLine = options.cover.studentNo
    ? `${options.cover.studentName} (${options.cover.labels.studentNoLabel}: ${options.cover.studentNo})`
    : options.cover.studentName;
  cover.drawText(studentLine, { x: MARGIN_PT, y: cursorY, size: 14, font: boldFont });

  const qrSize = 30 * MM_TO_PT;
  cover.drawRectangle({
    x: A4_WIDTH_PT - MARGIN_PT - qrSize,
    y: A4_HEIGHT_PT - MARGIN_PT - qrSize,
    width: qrSize,
    height: qrSize,
    borderWidth: 1,
  });

  const copiedPages = await outDoc.copyPages(baseDoc, baseDoc.getPageIndices());
  for (const page of copiedPages) {
    outDoc.addPage(page);
  }

  if (options.watermark) {
    for (const page of outDoc.getPages()) {
      drawTiledWatermark(page, options.watermark, font);
    }
  }

  return outDoc.save();
}
