import { PDFDocument, type PDFFont, type PDFPage, rgb } from 'pdf-lib';

import { embedPdfFonts, type PdfFontBytes } from '@testcim/pdf-fonts';

import type { OmrAnswerBubble, OmrFormTemplate, OmrTextField } from './template';

const MM_TO_PT = 72 / 25.4;

function pt(mm: number): number {
  return mm * MM_TO_PT;
}

export interface OmrFormPdfMeta {
  readonly testTitle: string;
  /** Printed next to the QR placeholder box; also what a future QR decoder would encode. */
  readonly formId: string;
  /**
   * Printed labels. Supplied by the caller (from apps/web/messages) rather than
   * hardcoded here: this package has no localization dependency, per CLAUDE.md's rule
   * that every user-visible string flows through messages/*.json.
   */
  readonly nameLabel: string;
  readonly classLabel: string;
}

type ToPagePoint = (xMm: number, yMm: number) => { readonly x: number; readonly y: number };

function drawField(
  page: PDFPage,
  field: OmrTextField,
  label: string,
  font: PDFFont,
  toPagePoint: ToPagePoint,
): void {
  const { x, y } = toPagePoint(field.x, field.y + field.height);
  page.drawRectangle({
    x,
    y,
    width: pt(field.width),
    height: pt(field.height),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  page.drawText(label, { x, y: y + pt(field.height) + 2, size: 6, font });
}

function drawBubble(
  page: PDFPage,
  bubble: OmrAnswerBubble,
  font: PDFFont,
  toPagePoint: ToPagePoint,
): void {
  const centerX = bubble.x + bubble.diameter / 2;
  const centerY = bubble.y + bubble.diameter / 2;
  const { x, y } = toPagePoint(centerX, centerY);
  page.drawCircle({
    x,
    y,
    size: pt(bubble.diameter) / 2,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.75,
  });
  page.drawText(bubble.option, { x: x - 1.5, y: y - 2, size: 5, font });
}

/**
 * Builds the printable OMR form PDF from a template. Pure and I/O-free like
 * `packages/renderers`' PDF contract (docs/adr/0002 sec. "renderPdf"): the caller (a
 * Web Worker in apps/web) is responsible for triggering the "gerçek boyut yazdır"
 * warning and for turning the returned bytes into a download or an upload.
 *
 * Text is set in the shared Turkish-capable font (`@testcim/pdf-fonts`, docs/adr/0011), so
 * labels with ı/İ/ğ/Ğ/ş/Ş render correctly. The caller loads the font bytes.
 */
export async function renderOmrFormPdf(
  template: OmrFormTemplate,
  meta: OmrFormPdfMeta,
  fontBytes: PdfFontBytes,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { regular: font } = await embedPdfFonts(doc, fontBytes);
  const pageWidthPt = pt(template.pageWidthMm);
  const pageHeightPt = pt(template.pageHeightMm);

  for (const page of template.pages) {
    const pdfPage = doc.addPage([pageWidthPt, pageHeightPt]);
    const toPagePoint: ToPagePoint = (xMm, yMm) => ({ x: pt(xMm), y: pageHeightPt - pt(yMm) });

    for (const corner of page.corners) {
      const { x, y } = toPagePoint(corner.x, corner.y + corner.size);
      pdfPage.drawRectangle({
        x,
        y,
        width: pt(corner.size),
        height: pt(corner.size),
        color: rgb(0, 0, 0),
      });
    }

    const { x: qrX, y: qrY } = toPagePoint(page.qr.x, page.qr.y + page.qr.size);
    pdfPage.drawRectangle({
      x: qrX,
      y: qrY,
      width: pt(page.qr.size),
      height: pt(page.qr.size),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    pdfPage.drawText(meta.formId, {
      x: qrX + 2,
      y: qrY + pt(page.qr.size) / 2,
      size: 5,
      font,
      maxWidth: pt(page.qr.size) - 4,
    });

    if (page.nameField) {
      drawField(pdfPage, page.nameField, meta.nameLabel, font, toPagePoint);
    }
    if (page.classField) {
      drawField(pdfPage, page.classField, meta.classLabel, font, toPagePoint);
    }
    for (const bubble of page.studentNumber ?? []) {
      drawBubble(pdfPage, bubble, font, toPagePoint);
    }
    for (const bubble of page.bookletCode ?? []) {
      drawBubble(pdfPage, bubble, font, toPagePoint);
    }
    for (const bubble of page.answers) {
      drawBubble(pdfPage, bubble, font, toPagePoint);
    }

    const [topLeft] = page.corners;
    pdfPage.drawText(`${meta.testTitle} - ${page.pageIndex + 1}/${template.pages.length}`, {
      x: pt(topLeft.x + topLeft.size + 4),
      y: pageHeightPt - pt(topLeft.y + topLeft.size / 2),
      size: 8,
      font,
    });
  }

  return doc.save();
}
