import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type QueueEntryStatus =
  'pending' | 'processing' | 'uploading' | 'registering' | 'done' | 'error';

export interface CaptureQueueEntry {
  readonly id: string;
  readonly testId: string;
  readonly workspaceId: string;
  readonly blob: Blob;
  readonly position: string;
  readonly status: QueueEntryStatus;
  readonly attempts: number;
  readonly lastError: string | null;
  readonly createdAt: number;
}

interface CaptureQueueSchema extends DBSchema {
  entries: {
    key: string;
    value: CaptureQueueEntry;
    indexes: { 'by-test': string };
  };
}

const DB_NAME = 'testcim-capture-queue';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CaptureQueueSchema>> | undefined;

/**
 * One shared IndexedDB connection for the tab. Persisting the upload queue
 * here (docs/02 §5.1) is what lets a paste survive a tab close/reopen or a
 * dropped connection — the queue resumes from wherever it left off.
 */
function getDb(): Promise<IDBPDatabase<CaptureQueueSchema>> {
  dbPromise ??= openDB<CaptureQueueSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('entries', { keyPath: 'id' });
      store.createIndex('by-test', 'testId');
    },
  });
  return dbPromise;
}

export async function putQueueEntry(entry: CaptureQueueEntry): Promise<void> {
  const db = await getDb();
  await db.put('entries', entry);
}

export async function updateQueueEntry(
  id: string,
  patch: Partial<Omit<CaptureQueueEntry, 'id'>>,
): Promise<CaptureQueueEntry | undefined> {
  const db = await getDb();
  const existing = await db.get('entries', id);
  if (!existing) {
    return undefined;
  }
  const updated = { ...existing, ...patch };
  await db.put('entries', updated);
  return updated;
}

export async function deleteQueueEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('entries', id);
}

export async function listQueueEntriesForTest(testId: string): Promise<CaptureQueueEntry[]> {
  const db = await getDb();
  return db.getAllFromIndex('entries', 'by-test', testId);
}

/** Entries left over from a previous tab session that never finished (docs/02 §5.1: resumable). */
export async function listResumableEntries(testId: string): Promise<CaptureQueueEntry[]> {
  const all = await listQueueEntriesForTest(testId);
  return all.filter((entry) => entry.status !== 'done');
}
