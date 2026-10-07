import { PDFDocument, degrees, rgb, type PDFImage, type PDFPage } from 'pdf-lib';

import { embedPdfFonts, type PdfFontBytes } from '@testcim/pdf-fonts';

import { PAINT_RGB } from './paint-colors';

import type { PaintColor, PaintCommand, PaintPage } from './paint-types';

const PT_PER_MM = 72 / 25.4;
/** Plex's ascent, as a fraction of the font size (hhea.ascender / unitsPerEm). */
const ASCENT = 1.025;
const DOTTED_DASH = [0.8, 1.6];

export interface PdfImageInput {
  readonly bytes: Uint8Array;
  readonly format: 'png' | 'jpeg';
}

export interface RenderPaintPdfOptions {
  readonly title?: string;
}

function color(token: PaintColor) {
  const [r, g, b] = PAINT_RGB[token];
  return rgb(r / 255, g / 255, b / 255);
}

/**
 * Draws the paint pages into a PDF: vector text in the embedded Turkish-capable font, rules
 * and frames as vectors, and each question image embedded once at its original resolution.
 * Pure and I/O-free like the other renderers; the caller supplies the font and image bytes.
 */
export async function renderPaintPdf(
  pages: readonly PaintPage[],
  images: ReadonlyMap<string, PdfImageInput>,
  fontBytes: PdfFontBytes,
  options: RenderPaintPdfOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  if (options.title) doc.setTitle(options.title);
  const fonts = await embedPdfFonts(doc, fontBytes);

  const embedded = new Map<string, Promise<PDFImage>>();
  const embedImage = (key: string): Promise<PDFImage> | null => {
    const source = images.get(key);
    if (!source) return null;
    let promise = embedded.get(key);
    if (!promise) {
      promise = source.format === 'png' ? doc.embedPng(source.bytes) : doc.embedJpg(source.bytes);
      embedded.set(key, promise);
    }
    return promise;
  };

  for (const paintPage of pages) {
    const widthPt = paintPage.widthMm * PT_PER_MM;
    const heightPt = paintPage.heightMm * PT_PER_MM;
    const page: PDFPage = doc.addPage([widthPt, heightPt]);

    const drawCommand = async (command: PaintCommand) => {
      switch (command.type) {
        case 'text': {
          const font = fonts[command.weight];
          const textWidthPt = font.widthOfTextAtSize(command.text, command.sizePt);
          const boxPt = command.w * PT_PER_MM;
          const offsetPt =
            command.align === 'center'
              ? (boxPt - textWidthPt) / 2
              : command.align === 'right'
                ? boxPt - textWidthPt
                : 0;
          page.drawText(command.text, {
            x: command.x * PT_PER_MM + offsetPt,
            y: heightPt - (command.y * PT_PER_MM + ASCENT * command.sizePt),
            size: command.sizePt,
            font,
            color: color(command.color),
            ...(command.rotateDeg ? { rotate: degrees(command.rotateDeg) } : {}),
            ...(command.opacity !== undefined ? { opacity: command.opacity } : {}),
          });
          return;
        }
        case 'line':
          page.drawLine({
            start: { x: command.x1 * PT_PER_MM, y: heightPt - command.y1 * PT_PER_MM },
            end: { x: command.x2 * PT_PER_MM, y: heightPt - command.y2 * PT_PER_MM },
            thickness: command.widthMm * PT_PER_MM,
            color: color(command.color),
            ...(command.dotted ? { dashArray: DOTTED_DASH } : {}),
          });
          return;
        case 'rect':
          page.drawRectangle({
            x: command.x * PT_PER_MM,
            y: heightPt - (command.y + command.h) * PT_PER_MM,
            width: command.w * PT_PER_MM,
            height: command.h * PT_PER_MM,
            ...(command.fill ? { color: color(command.fill) } : {}),
            ...(command.stroke
              ? { borderColor: color(command.stroke), borderWidth: command.strokeMm * PT_PER_MM }
              : {}),
          });
          return;
        case 'image': {
          const pending = embedImage(command.key);
          if (!pending) return;
          const image = await pending;
          // Contain, anchored top-left, like the preview's object-fit.
          const boxW = command.w * PT_PER_MM;
          const boxH = command.h * PT_PER_MM;
          const scale = Math.min(boxW / image.width, boxH / image.height);
          const drawW = image.width * scale;
          const drawH = image.height * scale;
          page.drawImage(image, {
            x: command.x * PT_PER_MM,
            y: heightPt - command.y * PT_PER_MM - drawH,
            width: drawW,
            height: drawH,
          });
          return;
        }
      }
    };

    for (const command of paintPage.commands) {
      await drawCommand(command);
    }
  }

  return doc.save();
}
