'use client';

import { uuidv7 } from 'uuidv7';

import type { CaptureWorkerRequest, CaptureWorkerResponse } from './capture.worker';
import type { EncodeOptions, EncodeResult } from './encode';

let worker: Worker | undefined;
const pending = new Map<
  string,
  { resolve: (r: EncodeResult) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  worker ??= new Worker(new URL('./capture.worker.ts', import.meta.url));
  worker.onmessage = (event: MessageEvent<CaptureWorkerResponse>) => {
    const entry = pending.get(event.data.id);
    if (!entry) {
      return;
    }
    pending.delete(event.data.id);

    if (event.data.ok) {
      entry.resolve(event.data.result);
    } else {
      entry.reject(new Error(event.data.error));
    }
  };
  return worker;
}

/** Runs `encodeCapturedImage` off the main thread (docs/02 §6: heavy image work stays in a Worker). */
export function runEncode(blob: Blob, options?: EncodeOptions): Promise<EncodeResult> {
  return new Promise<EncodeResult>((resolve, reject) => {
    const id = uuidv7();
    pending.set(id, { resolve, reject });
    const request: CaptureWorkerRequest = options ? { id, blob, options } : { id, blob };
    getWorker().postMessage(request);
  });
}
