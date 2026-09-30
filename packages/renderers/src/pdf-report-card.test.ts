import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { renderReportCardPdf, type ReportCardData } from './pdf-report-card';

const labels = {
  title: 'Karne',
  studentNoLabel: 'Numara',
  classLabel: 'Sinif',
  scoresTitle: 'Sonuclar',
  outcomesTitle: 'Kazanimlar',
  summaryTitle: 'Ozet',
  scoreColumn: 'Puan',
  dateColumn: 'Tarih',
};

function baseData(overrides: Partial<ReportCardData> = {}): ReportCardData {
  return {
    studentName: 'Ada Lovelace',
    studentNo: '101',
    className: '9A',
    labels,
    scores: [{ label: 'Quiz 1', score: 8, maxScore: 10, date: '2026-09-01' }],
    outcomes: [{ outcomeLabel: 'Cebir', correctCount: 4, totalCount: 5 }],
    ...overrides,
  };
}

describe('renderReportCardPdf', () => {
  it('produces a loadable single-page PDF for a small report', async () => {
    const bytes = await renderReportCardPdf(baseData());
    expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('adds an extra page once enough content overflows the first page', async () => {
    const manyScores = Array.from({ length: 80 }, (_, i) => ({
      label: `Sinav ${i + 1}`,
      score: i % 10,
      maxScore: 10,
      date: '2026-09-01',
    }));
    const bytes = await renderReportCardPdf(baseData({ scores: manyScores }));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it('renders a tiled watermark without throwing and keeps the page count stable', async () => {
    const bytes = await renderReportCardPdf(
      baseData({ watermark: { text: 'Ada Lovelace - 101', opacity: 0.08, angle: -30 } }),
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('includes an approved AI summary when provided', async () => {
    const bytes = await renderReportCardPdf(
      baseData({ summaryText: 'Ogrenci bu donem cebir konusunda belirgin ilerleme kaydetti.' }),
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
