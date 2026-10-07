import { renderTestDocx, renderTestPptx, type ExportTestData } from '@testcim/renderers/export';

export interface ExportRequest {
  readonly id: string;
  readonly kind: 'docx' | 'pptx';
  readonly data: ExportTestData;
}

export type ExportResponse =
  | { readonly id: string; readonly ok: true; readonly bytes: Uint8Array }
  | { readonly id: string; readonly ok: false; readonly error: string };

/** Builds the Word or PowerPoint file off the main thread (docs/02 §6). */
self.onmessage = async (event: MessageEvent<ExportRequest>) => {
  const { id, kind, data } = event.data;
  try {
    const bytes = kind === 'docx' ? await renderTestDocx(data) : await renderTestPptx(data);
    const response: ExportResponse = { id, ok: true, bytes };
    self.postMessage(response, { transfer: [bytes.buffer] });
  } catch (error) {
    const response: ExportResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'export_failed',
    };
    self.postMessage(response);
  }
};
