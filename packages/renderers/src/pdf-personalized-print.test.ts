import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { addPersonalizedCoverPage } from './pdf-personalized-print';

async function makeBasePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i += 1) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Question page ${i + 1}`, { x: 50, y: 700, size: 12, font });
  }
  return doc.save();
}

const cover = {
  studentName: 'Ada Lovelace',
  studentNo: '101',
  className: '9A',
  testTitle: 'Matematik Sinavi',
  labels: { studentNoLabel: 'Numara', classLabel: 'Sinif' },
};

describe('addPersonalizedCoverPage', () => {
  it('prepends exactly one cover page to the base exam PDF', async () => {
    const base = await makeBasePdf(3);
    const result = await addPersonalizedCoverPage(base, { cover });

    const baseDoc = await PDFDocument.load(base);
    const resultDoc = await PDFDocument.load(result);
    expect(resultDoc.getPageCount()).toBe(baseDoc.getPageCount() + 1);
  });

  it('tiles a watermark across every page including the cover', async () => {
    const base = await makeBasePdf(2);
    const result = await addPersonalizedCoverPage(base, {
      cover,
      watermark: { text: 'Ada Lovelace - 101', opacity: 0.08, angle: -30 },
    });

    const resultDoc = await PDFDocument.load(result);
    expect(resultDoc.getPageCount()).toBe(3);
  });
});
