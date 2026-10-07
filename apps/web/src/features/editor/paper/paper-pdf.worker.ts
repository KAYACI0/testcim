import type { PdfFontBytes } from '@testcim/pdf-fonts';
import { renderPaintPdf, type PaintPage, type PdfImageInput } from '@testcim/renderers/paint';

export interface PaperPdfRequest {
  readonly id: string;
  readonly pages: readonly PaintPage[];
  readonly images: readonly (readonly [string, PdfImageInput])[];
  readonly fontBytes: PdfFontBytes;
  readonly title: string;
}

export type PaperPdfResponse =
  | { readonly id: string; readonly ok: true; readonly bytes: Uint8Array }
  | { readonly id: string; readonly ok: false; readonly error: string };

/** Builds the PDF off the main thread (docs/02 §6: heavy PDF work stays in a Worker). */
self.onmessage = async (event: MessageEvent<PaperPdfRequest>) => {
  const { id, pages, images, fontBytes, title } = event.data;
  try {
    const bytes = await renderPaintPdf(pages, new Map(images), fontBytes, { title });
    const response: PaperPdfResponse = { id, ok: true, bytes };
    self.postMessage(response, { transfer: [bytes.buffer] });
  } catch (error) {
    const response: PaperPdfResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'pdf_failed',
    };
    self.postMessage(response);
  }
};
