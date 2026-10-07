'use client';

import { useCallback, useState } from 'react';
import { uuidv7 } from 'uuidv7';

import { fetchPdfFontBytes } from '@testcim/pdf-fonts';

import { getClassReportCardSources } from './actions.server';

import type { BulkReportCardMessage, BulkReportCardRequest } from './report-cards-bulk.worker';

let worker: Worker | undefined;
const pending = new Map<
  string,
  {
    readonly onProgress: (done: number, total: number) => void;
    readonly resolve: (zipBytes: Uint8Array) => void;
    readonly reject: (error: Error) => void;
  }
>();

function getWorker(): Worker {
  worker ??= new Worker(new URL('./report-cards-bulk.worker.ts', import.meta.url));
  worker.onmessage = (event: MessageEvent<BulkReportCardMessage>) => {
    const entry = pending.get(event.data.id);
    if (!entry) return;
    if (event.data.kind === 'progress') {
      entry.onProgress(event.data.done, event.data.total);
      return;
    }
    pending.delete(event.data.id);
    if (event.data.kind === 'done') entry.resolve(event.data.zipBytes);
    else entry.reject(new Error(event.data.error));
  };
  return worker;
}

function sanitizeFileNamePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface BulkReportCardProgress {
  readonly done: number;
  readonly total: number;
}

export type BulkReportCardOutcome = 'done' | 'empty' | 'failed';

/**
 * Downloads every student's karne (report card) for a class as one ZIP. The server only
 * supplies scores and approved summaries; the PDFs are rendered and zipped in a Worker so a
 * large class never freezes the tab (CLAUDE.md, docs/prompts/12 §4).
 */
export function useBulkReportCards(classId: string) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<BulkReportCardProgress | null>(null);
  const [outcome, setOutcome] = useState<BulkReportCardOutcome | null>(null);

  const download = useCallback(() => {
    setBusy(true);
    setOutcome(null);
    setProgress(null);

    void (async () => {
      try {
        const result = await getClassReportCardSources(classId);
        if (!result.ok) {
          setOutcome('failed');
          return;
        }
        if (result.sources.length === 0) {
          setOutcome('empty');
          return;
        }

        const fontBytes = await fetchPdfFontBytes();
        const items = result.sources.map((source) => ({
          studentId: source.studentId,
          fileName: `karne-${sanitizeFileNamePart(source.studentName) || source.studentId}.pdf`,
          data: source.data,
        }));

        const zipBytes = await new Promise<Uint8Array>((resolve, reject) => {
          const id = uuidv7();
          pending.set(id, {
            onProgress: (done, total) => setProgress({ done, total }),
            resolve,
            reject,
          });
          getWorker().postMessage({ id, items, fontBytes } satisfies BulkReportCardRequest);
        });

        const url = URL.createObjectURL(
          new Blob([zipBytes as BlobPart], { type: 'application/zip' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `karneler-${sanitizeFileNamePart(result.className) || 'sinif'}.zip`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setOutcome('done');
      } catch {
        setOutcome('failed');
      } finally {
        setBusy(false);
      }
    })();
  }, [classId]);

  return { busy, progress, outcome, download };
}
