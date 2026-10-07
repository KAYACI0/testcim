import JSZip from 'jszip';

import type { PdfFontBytes } from '@testcim/pdf-fonts';
import {
  addPersonalizedCoverPage,
  type PersonalizedCoverMeta,
  type WatermarkOptions,
} from '@testcim/renderers/report-cards';

export interface PersonalizedPrintItem {
  readonly studentId: string;
  readonly fileName: string;
  readonly cover: PersonalizedCoverMeta;
  readonly watermark?: WatermarkOptions;
}

export interface PersonalizedPrintRequest {
  readonly id: string;
  readonly basePdfBytes: Uint8Array;
  readonly fontBytes: PdfFontBytes;
  readonly items: readonly PersonalizedPrintItem[];
}

export type PersonalizedPrintMessage =
  | {
      readonly id: string;
      readonly kind: 'progress';
      readonly done: number;
      readonly total: number;
    }
  | { readonly id: string; readonly kind: 'done'; readonly zipBytes: Uint8Array }
  | { readonly id: string; readonly kind: 'error'; readonly error: string };

/**
 * Prepends a name/QR cover page (and optional per-student watermark) to the base exam PDF
 * for every student in the class, then zips the results off the main thread (docs/02 §6,
 * docs/prompts/12 §5).
 */
self.onmessage = async (event: MessageEvent<PersonalizedPrintRequest>) => {
  const { id, basePdfBytes, fontBytes, items } = event.data;
  try {
    const zip = new JSZip();
    let done = 0;
    for (const item of items) {
      const bytes = await addPersonalizedCoverPage(
        basePdfBytes,
        { cover: item.cover, ...(item.watermark ? { watermark: item.watermark } : {}) },
        fontBytes,
      );
      zip.file(item.fileName, bytes);
      done += 1;
      const progress: PersonalizedPrintMessage = {
        id,
        kind: 'progress',
        done,
        total: items.length,
      };
      self.postMessage(progress);
    }

    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    const response: PersonalizedPrintMessage = { id, kind: 'done', zipBytes };
    self.postMessage(response, { transfer: [zipBytes.buffer] });
  } catch (error) {
    const response: PersonalizedPrintMessage = {
      id,
      kind: 'error',
      error: error instanceof Error ? error.message : 'personalized_print_failed',
    };
    self.postMessage(response);
  }
};
