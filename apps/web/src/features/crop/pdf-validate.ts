import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Opens a PDF just far enough to read its page count, then closes it again
 * (docs/adr/0003 §1: "render yapılmaz, yalnızca belge açılır ve kapatılır").
 * Called from `finalizeSourceDocument` (a `'use server'` action, so this
 * already never reaches the browser) against bytes already sitting in
 * Storage — this is the "sayfa sınırı... sunucuda doğrulanır" check from
 * docs/02 §5.1. Kept in its own module, without the `server-only` marker,
 * so it stays testable against the real fixture PDFs without mocking
 * Supabase or Next's server-only build condition.
 */
export async function readPdfPageCount(bytes: Uint8Array): Promise<number> {
  const loadingTask = getDocument({ data: bytes });
  try {
    const doc = await loadingTask.promise;
    return doc.numPages;
  } finally {
    await loadingTask.destroy();
  }
}
