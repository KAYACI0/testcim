import { backoffDelayMs, createConcurrencyLimiter } from './concurrency';
import { deleteQueueEntry, putQueueEntry, updateQueueEntry, type CaptureQueueEntry } from './db';

import type { EncodeOptions, EncodeResult } from '../worker/encode';

export interface RegisterCapturedQuestionInput {
  readonly testId: string;
  readonly itemId: string;
  readonly position: string;
  readonly path: string;
  readonly mime: string;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly phash: string;
}

export type RegisterCapturedQuestionResult =
  | { readonly ok: true; readonly questionId: string; readonly questionRevisionId: string }
  | { readonly ok: false; readonly reason: string };

export interface CaptureProcessorDeps {
  readonly encode: (blob: Blob, options?: EncodeOptions) => Promise<EncodeResult>;
  readonly upload: (path: string, blob: Blob, mime: string) => Promise<void>;
  readonly registerQuestion: (
    input: RegisterCapturedQuestionInput,
  ) => Promise<RegisterCapturedQuestionResult>;
  readonly onEncoded?: (
    id: string,
    info: { thumbnailUrl: string; sha256: string; phash: string },
  ) => void;
  readonly onSuccess: (
    id: string,
    result: { questionId: string; questionRevisionId: string },
  ) => void;
  readonly onError: (id: string, message: string) => void;
  readonly maxAttempts?: number;
  readonly maxConcurrent?: number;
  /** Overridable for tests; production leaves this at `backoffDelayMs`'s default 1s/30s. */
  readonly backoffBaseMs?: number;
  readonly backoffMaxMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Runs one queue entry through encode → upload → register, with the
 * concurrency cap and retry/backoff docs/02 §5.1 calls for. A caller-owned
 * `deps` object keeps this testable without a real Worker, Storage bucket,
 * or server action.
 */
export function createCaptureProcessor(deps: CaptureProcessorDeps) {
  const limit = createConcurrencyLimiter(deps.maxConcurrent ?? 4);
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  async function runOnce(entry: CaptureQueueEntry): Promise<void> {
    await updateQueueEntry(entry.id, { status: 'processing' });

    try {
      const encoded = await deps.encode(entry.blob);
      deps.onEncoded?.(entry.id, {
        thumbnailUrl: URL.createObjectURL(encoded.thumbnail),
        sha256: encoded.sha256,
        phash: encoded.phash,
      });

      await updateQueueEntry(entry.id, { status: 'uploading' });
      const year = new Date().getFullYear();
      const path = `${entry.workspaceId}/${year}/${entry.id}.png`;
      await deps.upload(path, encoded.original, 'image/png');

      await updateQueueEntry(entry.id, { status: 'registering' });
      const result = await deps.registerQuestion({
        testId: entry.testId,
        itemId: entry.id,
        position: entry.position,
        path,
        mime: 'image/png',
        bytes: encoded.bytes,
        width: encoded.width,
        height: encoded.height,
        sha256: encoded.sha256,
        phash: encoded.phash,
      });

      if (!result.ok) {
        // Server-side rejection (quota, storage limit): retrying with the
        // same content won't help, so this is terminal, not a retry case.
        await updateQueueEntry(entry.id, { status: 'error', lastError: result.reason });
        deps.onError(entry.id, result.reason);
        return;
      }

      await deleteQueueEntry(entry.id);
      deps.onSuccess(entry.id, {
        questionId: result.questionId,
        questionRevisionId: result.questionRevisionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'capture_failed';
      const attempts = entry.attempts + 1;

      if (attempts >= maxAttempts) {
        await updateQueueEntry(entry.id, { status: 'error', attempts, lastError: message });
        deps.onError(entry.id, message);
        return;
      }

      await updateQueueEntry(entry.id, { status: 'pending', attempts, lastError: message });
      const delay = backoffDelayMs(attempts, deps.backoffBaseMs, deps.backoffMaxMs);
      const timer = setTimeout(() => {
        timers.delete(entry.id);
        void schedule({ ...entry, attempts });
      }, delay);
      timers.set(entry.id, timer);
    }
  }

  function schedule(entry: CaptureQueueEntry): Promise<void> {
    return limit(() => runOnce(entry));
  }

  return {
    /** Persists the entry and starts processing it (subject to the concurrency cap). */
    async enqueue(entry: CaptureQueueEntry): Promise<void> {
      await putQueueEntry(entry);
      void schedule(entry);
    },

    /** Re-queues an entry that reached its terminal error state, resetting its attempt count. */
    async retry(entry: CaptureQueueEntry): Promise<void> {
      const reset = { ...entry, status: 'pending' as const, attempts: 0, lastError: null };
      await updateQueueEntry(entry.id, { status: 'pending', attempts: 0, lastError: null });
      void schedule(reset);
    },

    /** Cancels a scheduled retry timer, if one is pending, for an entry the user removed. */
    cancel(id: string): void {
      const timer = timers.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(id);
      }
    },
  };
}

export type CaptureProcessor = ReturnType<typeof createCaptureProcessor>;
