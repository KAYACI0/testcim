import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteQueueEntry, listQueueEntriesForTest, type CaptureQueueEntry } from './db';
import { createCaptureProcessor, type CaptureProcessorDeps } from './processor';

import type { EncodeResult } from '../worker/encode';

function makeEntry(overrides: Partial<CaptureQueueEntry> & { id: string }): CaptureQueueEntry {
  return {
    testId: 't1',
    workspaceId: 'ws1',
    blob: new Blob(['x']),
    position: 'a0',
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

const encoded: EncodeResult = {
  original: new Blob(['png']),
  thumbnail: new Blob(['webp']),
  width: 100,
  height: 50,
  bytes: 3,
  sha256: 'abc',
  phash: 'def',
};

beforeEach(async () => {
  const entries = await listQueueEntriesForTest('t1');
  await Promise.all(entries.map((e) => deleteQueueEntry(e.id)));
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:thumb') });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCaptureProcessor', () => {
  it('runs encode -> upload -> register and reports success', async () => {
    const upload = vi.fn().mockResolvedValue(undefined);
    const registerQuestion = vi
      .fn()
      .mockResolvedValue({ ok: true, questionId: 'q1', questionRevisionId: 'qr1' });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const processor = createCaptureProcessor({
      encode: vi.fn().mockResolvedValue(encoded),
      upload,
      registerQuestion,
      onSuccess,
      onError,
    } satisfies CaptureProcessorDeps);

    await processor.enqueue(makeEntry({ id: 'a' }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());

    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining('ws1/'),
      encoded.original,
      'image/png',
    );
    expect(registerQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ testId: 't1', sha256: 'abc', phash: 'def' }),
    );
    expect(onSuccess).toHaveBeenCalledWith('a', { questionId: 'q1', questionRevisionId: 'qr1' });
    expect(await listQueueEntriesForTest('t1')).toEqual([]);
  });

  it('treats a server rejection (e.g. quota) as terminal, not retried', async () => {
    const registerQuestion = vi
      .fn()
      .mockResolvedValue({ ok: false, reason: 'usage_limit_exceeded' });
    const onError = vi.fn();

    const processor = createCaptureProcessor({
      encode: vi.fn().mockResolvedValue(encoded),
      upload: vi.fn().mockResolvedValue(undefined),
      registerQuestion,
      onSuccess: vi.fn(),
      onError,
    });

    await processor.enqueue(makeEntry({ id: 'a' }));
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('a', 'usage_limit_exceeded'));

    expect(registerQuestion).toHaveBeenCalledTimes(1);
    const [remaining] = await listQueueEntriesForTest('t1');
    expect(remaining?.status).toBe('error');
  });

  it('retries a transient failure with backoff, then succeeds', async () => {
    const encode = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(encoded);
    const onSuccess = vi.fn();

    const processor = createCaptureProcessor({
      encode,
      upload: vi.fn().mockResolvedValue(undefined),
      registerQuestion: vi
        .fn()
        .mockResolvedValue({ ok: true, questionId: 'q1', questionRevisionId: 'qr1' }),
      onSuccess,
      onError: vi.fn(),
      backoffBaseMs: 5,
      backoffMaxMs: 5,
    });

    await processor.enqueue(makeEntry({ id: 'a' }));
    await vi.waitFor(() => expect(encode).toHaveBeenCalledTimes(2));
    await vi.waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith('a', { questionId: 'q1', questionRevisionId: 'qr1' }),
    );
  });

  it('gives up after maxAttempts and reports a terminal error', async () => {
    const encode = vi.fn().mockRejectedValue(new Error('always fails'));
    const onError = vi.fn();

    const processor = createCaptureProcessor({
      encode,
      upload: vi.fn(),
      registerQuestion: vi.fn(),
      onSuccess: vi.fn(),
      onError,
      maxAttempts: 2,
      backoffBaseMs: 5,
      backoffMaxMs: 5,
    });

    await processor.enqueue(makeEntry({ id: 'a' }));
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('a', 'always fails'));
    expect(encode).toHaveBeenCalledTimes(2);
  });
});
