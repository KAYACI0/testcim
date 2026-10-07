'use client';

import { useCallback, useState } from 'react';
import { uuidv7 } from 'uuidv7';

import { loadPaperFonts } from './paper-assets';
import { buildPaperPdfBytes } from './paper-export';

import type {
  PersonalizedPrintItem,
  PersonalizedPrintMessage,
  PersonalizedPrintRequest,
} from './personalized-print.worker';

import { getClassRoster } from '@/features/classes/actions.server';

const coverLabels = { studentNoLabel: 'Numara', classLabel: 'Sınıf' } as const;

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
  worker ??= new Worker(new URL('./personalized-print.worker.ts', import.meta.url));
  worker.onmessage = (event: MessageEvent<PersonalizedPrintMessage>) => {
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

export interface PersonalizedPrintProgress {
  readonly done: number;
  readonly total: number;
}

export type PersonalizedPrintOutcome = 'done' | 'empty' | 'failed';

/**
 * Builds one personalized exam PDF per student in a class (name/QR cover page, optional
 * leak-tracking watermark) and zips them, off the main thread (docs/prompts/12 §5).
 */
export function usePersonalizedPrint() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<PersonalizedPrintProgress | null>(null);
  const [outcome, setOutcome] = useState<PersonalizedPrintOutcome | null>(null);

  const download = useCallback((classId: string, includeWatermark: boolean) => {
    setBusy(true);
    setOutcome(null);
    setProgress(null);

    void (async () => {
      try {
        const [{ bytes: basePdfBytes, title }, fonts, roster] = await Promise.all([
          buildPaperPdfBytes(),
          loadPaperFonts(),
          getClassRoster(classId),
        ]);

        if (!roster) {
          setOutcome('failed');
          return;
        }
        if (roster.students.length === 0) {
          setOutcome('empty');
          return;
        }

        const items: PersonalizedPrintItem[] = roster.students.map((student) => {
          const watermarkText = student.student_no
            ? `${student.full_name} - ${student.student_no}`
            : student.full_name;
          return {
            studentId: student.id,
            fileName: `${sanitizeFileNamePart(student.full_name) || student.id}.pdf`,
            cover: {
              studentName: student.full_name,
              studentNo: student.student_no,
              className: roster.className,
              testTitle: title,
              labels: coverLabels,
            },
            ...(includeWatermark
              ? { watermark: { text: watermarkText, opacity: 0.15, angle: 30 } }
              : {}),
          };
        });

        const zipBytes = await new Promise<Uint8Array>((resolve, reject) => {
          const id = uuidv7();
          pending.set(id, {
            onProgress: (done, total) => setProgress({ done, total }),
            resolve,
            reject,
          });
          getWorker().postMessage(
            { id, basePdfBytes, fontBytes: fonts.bytes, items } satisfies PersonalizedPrintRequest,
            { transfer: [basePdfBytes.buffer] },
          );
        });

        const url = URL.createObjectURL(
          new Blob([zipBytes as BlobPart], { type: 'application/zip' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `kisiye-ozel-${sanitizeFileNamePart(roster.className) || 'sinif'}.zip`;
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
  }, []);

  return { busy, progress, outcome, download };
}
