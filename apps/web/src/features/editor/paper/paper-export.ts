'use client';

import { useCallback, useState } from 'react';

import { PAGE_HEIGHT, PAGE_WIDTH } from './paginate';

export const PRINT_ROOT_ID = 'print-root';

const A4_MM = { width: 210, height: 297 } as const;

function pdfFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${cleaned || 'test'}.pdf`;
}

function waitForImages(root: HTMLElement): Promise<void> {
  const pending = Array.from(root.querySelectorAll('img'))
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    );
  return Promise.all(pending).then(() => undefined);
}

/** Opens the browser print dialog. Print CSS shows only the paper sheets. */
export function printPaper(): void {
  window.print();
}

/**
 * Renders each A4 sheet of the print copy to an image and saves them as one
 * PDF file on the user's computer. The PDF libraries load on demand.
 */
export async function downloadPaperPdf(title: string): Promise<void> {
  const root = document.getElementById(PRINT_ROOT_ID);
  const sheets = root ? Array.from(root.querySelectorAll<HTMLElement>('[data-paper-sheet]')) : [];
  if (!root || sheets.length === 0) {
    throw new Error('paper-not-ready');
  }

  await waitForImages(root);
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  for (const [index, sheet] of sheets.entries()) {
    const canvas = await html2canvas(sheet, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      onclone: (clonedDocument) => {
        const clonedRoot = clonedDocument.getElementById(PRINT_ROOT_ID);
        if (clonedRoot) {
          clonedRoot.style.position = 'static';
          clonedRoot.style.left = '0';
        }
      },
    });
    if (index > 0) {
      pdf.addPage();
    }
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_MM.width, A4_MM.height);
  }
  pdf.save(pdfFileName(title));
}

export function usePaperExport(title: string) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const downloadPdf = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      await downloadPaperPdf(title);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [title]);

  return { busy, failed, downloadPdf, print: printPaper };
}
