import { encodeCapturedImage, type EncodeOptions, type EncodeResult } from './encode';

export interface CaptureWorkerRequest {
  readonly id: string;
  readonly blob: Blob;
  readonly options?: EncodeOptions;
}

export type CaptureWorkerResponse =
  | { readonly id: string; readonly ok: true; readonly result: EncodeResult }
  | { readonly id: string; readonly ok: false; readonly error: string };

self.onmessage = async (event: MessageEvent<CaptureWorkerRequest>) => {
  const { id, blob, options } = event.data;

  try {
    const result = await encodeCapturedImage(blob, options);
    const response: CaptureWorkerResponse = { id, ok: true, result };
    postMessage(response);
  } catch (error) {
    const response: CaptureWorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'encode_failed',
    };
    postMessage(response);
  }
};
