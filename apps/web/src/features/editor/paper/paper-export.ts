'use client';

import { useCallback, useState } from 'react';
import { uuidv7 } from 'uuidv7';

import { fetchPdfImage, loadPaperFonts } from './paper-assets';
import { getPaperSource } from './paper-registry';

import type { PaperPdfRequest, PaperPdfResponse } from './paper-pdf.worker';

export const PRINT_ROOT_ID = 'print-root';

function pdfFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${cleaned || 'test'}.pdf`;
}

let worker: Worker | undefined;
const pending = new Map<
  string,
  { resolve: (bytes: Uint8Array) => void; reject: (error: Error) => void }
>();

function getWorker(): Worker {
  worker ??= new Worker(new URL('./paper-pdf.worker.ts', import.meta.url));
  worker.onmessage = (event: MessageEvent<PaperPdfResponse>) => {
    const entry = pending.get(event.data.id);
    if (!entry) return;
    pending.delete(event.data.id);
    if (event.data.ok) entry.resolve(event.data.bytes);
    else entry.reject(new Error(event.data.error));
  };
  return worker;
}

function renderInWorker(request: Omit<PaperPdfRequest, 'id'>): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const id = uuidv7();
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...request, id } satisfies PaperPdfRequest);
  });
}

/** Opens the browser print dialog. Print CSS shows only the paper sheets. */
export function printPaper(): void {
  window.print();
}

/**
 * Builds the PDF for the paper on screen. Question images are fetched at their original
 * resolution and the text stays vector, set in the embedded Turkish font. Shared by the
 * single-file download below and by the personalized-print bulk flow, which prepends a
 * per-student cover page to this same base PDF.
 */
export async function buildPaperPdfBytes(): Promise<{ bytes: Uint8Array; title: string }> {
  const source = getPaperSource();
  if (!source || source.pages.length === 0) {
    throw new Error('paper-not-ready');
  }

  const [fonts, images] = await Promise.all([
    loadPaperFonts(),
    Promise.all(
      [...source.imageUrls].map(async ([key, url]) => [key, await fetchPdfImage(url)] as const),
    ),
  ]);

  const bytes = await renderInWorker({
    pages: source.pages,
    images,
    fontBytes: fonts.bytes,
    title: source.title,
  });

  return { bytes, title: source.title };
}

/** Builds the PDF for the paper on screen and saves it. */
export async function downloadPaperPdf(): Promise<void> {
  const { bytes, title } = await buildPaperPdfBytes();

  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = pdfFileName(title);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function usePaperExport(_title?: string) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const downloadPdf = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      await downloadPaperPdf();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, failed, downloadPdf, print: printPaper };
}
