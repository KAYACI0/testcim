'use client';

import { useCallback, useState } from 'react';
import { uuidv7 } from 'uuidv7';

import type { ExportImage } from '@testcim/renderers/export';

import { authorizeExport } from './actions.server';
import { buildExportData } from './build-export-data';

import type { ExportRequest, ExportResponse } from './export.worker';

import { prepareExportImage } from '@/features/editor/paper/paper-assets';
import { getPaperSource } from '@/features/editor/paper/paper-registry';

export type ExportKind = 'docx' | 'pptx';

const MIME: Record<ExportKind, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

let worker: Worker | undefined;
const pending = new Map<
  string,
  { resolve: (bytes: Uint8Array) => void; reject: (error: Error) => void }
>();

function getWorker(): Worker {
  worker ??= new Worker(new URL('./export.worker.ts', import.meta.url));
  worker.onmessage = (event: MessageEvent<ExportResponse>) => {
    const entry = pending.get(event.data.id);
    if (!entry) return;
    pending.delete(event.data.id);
    if (event.data.ok) entry.resolve(event.data.bytes);
    else entry.reject(new Error(event.data.error));
  };
  return worker;
}

function build(request: Omit<ExportRequest, 'id'>): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const id = uuidv7();
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...request, id } satisfies ExportRequest);
  });
}

function fileName(title: string, kind: ExportKind): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${cleaned || 'test'}.${kind}`;
}

export type ExportOutcome = 'done' | 'denied' | 'failed';

/**
 * Word and PowerPoint export of the paper on screen. The server only decides whether the
 * plan allows it; the file is built here, from the same questions in the same order as
 * the PDF, so nothing large travels through a server request.
 */
export function useTestExport(correctAnswerLabel: string) {
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [outcome, setOutcome] = useState<ExportOutcome | null>(null);

  const download = useCallback(
    async (kind: ExportKind) => {
      setBusy(kind);
      setOutcome(null);
      try {
        const permission = await authorizeExport();
        if (!permission.ok) {
          setOutcome('denied');
          return;
        }

        const source = getPaperSource();
        if (!source) throw new Error('paper-not-ready');

        const images = new Map<string, ExportImage>();
        await Promise.all(
          source.questions.map(async (question) => {
            const url = source.imageUrls.get(question.id);
            if (url) images.set(question.id, await prepareExportImage(url));
          }),
        );

        const data = buildExportData({
          title: source.title,
          className: source.className,
          questions: source.questions,
          images,
          includeAnswers: source.includeAnswers,
          correctAnswerLabel,
        });
        const bytes = await build({ kind, data });

        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: MIME[kind] }));
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName(source.title, kind);
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setOutcome('done');
      } catch {
        setOutcome('failed');
      } finally {
        setBusy(null);
      }
    },
    [correctAnswerLabel],
  );

  return { busy, outcome, download };
}
