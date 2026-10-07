import JSZip from 'jszip';

import type { PdfFontBytes } from '@testcim/pdf-fonts';
import { renderReportCardPdf, type ReportCardData } from '@testcim/renderers/report-cards';

export interface BulkReportCardItem {
  readonly studentId: string;
  readonly fileName: string;
  readonly data: ReportCardData;
}

export interface BulkReportCardRequest {
  readonly id: string;
  readonly items: readonly BulkReportCardItem[];
  readonly fontBytes: PdfFontBytes;
}

export type BulkReportCardMessage =
  | {
      readonly id: string;
      readonly kind: 'progress';
      readonly done: number;
      readonly total: number;
    }
  | { readonly id: string; readonly kind: 'done'; readonly zipBytes: Uint8Array }
  | { readonly id: string; readonly kind: 'error'; readonly error: string };

/** Renders every student's karne PDF and zips them off the main thread (docs/02 §6). */
self.onmessage = async (event: MessageEvent<BulkReportCardRequest>) => {
  const { id, items, fontBytes } = event.data;
  try {
    const zip = new JSZip();
    let done = 0;
    for (const item of items) {
      const bytes = await renderReportCardPdf(item.data, fontBytes);
      zip.file(item.fileName, bytes);
      done += 1;
      const progress: BulkReportCardMessage = { id, kind: 'progress', done, total: items.length };
      self.postMessage(progress);
    }

    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    const response: BulkReportCardMessage = { id, kind: 'done', zipBytes };
    self.postMessage(response, { transfer: [zipBytes.buffer] });
  } catch (error) {
    const response: BulkReportCardMessage = {
      id,
      kind: 'error',
      error: error instanceof Error ? error.message : 'bulk_report_cards_failed',
    };
    self.postMessage(response);
  }
};
