import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  deleteQueueEntry,
  listQueueEntriesForTest,
  listResumableEntries,
  putQueueEntry,
  updateQueueEntry,
  type CaptureQueueEntry,
} from './db';

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

beforeEach(async () => {
  // fake-indexeddb keeps state across tests in the same file unless deleted.
  const entries = await listQueueEntriesForTest('t1');
  await Promise.all(entries.map((entry) => deleteQueueEntry(entry.id)));
});

describe('capture queue db', () => {
  it('persists an entry and reads it back by test id', async () => {
    await putQueueEntry(makeEntry({ id: 'a' }));
    const entries = await listQueueEntriesForTest('t1');
    expect(entries.map((e) => e.id)).toEqual(['a']);
  });

  it('updates fields on an existing entry without needing the full record', async () => {
    await putQueueEntry(makeEntry({ id: 'a' }));
    const updated = await updateQueueEntry('a', { status: 'uploading', attempts: 1 });

    expect(updated?.status).toBe('uploading');
    expect(updated?.attempts).toBe(1);
    expect(updated?.testId).toBe('t1');
  });

  it('returns undefined when updating an entry that does not exist', async () => {
    expect(await updateQueueEntry('missing', { status: 'error' })).toBeUndefined();
  });

  it('excludes done entries from the resumable list', async () => {
    await putQueueEntry(makeEntry({ id: 'a', status: 'done' }));
    await putQueueEntry(makeEntry({ id: 'b', status: 'error' }));

    const resumable = await listResumableEntries('t1');
    expect(resumable.map((e) => e.id)).toEqual(['b']);
  });

  it('deletes an entry', async () => {
    await putQueueEntry(makeEntry({ id: 'a' }));
    await deleteQueueEntry('a');
    expect(await listQueueEntriesForTest('t1')).toEqual([]);
  });
});
