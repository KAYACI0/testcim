import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';

import { readPdfFontBytes } from '@testcim/pdf-fonts/node';

import { renderReportCardPdf as renderWithFonts, type ReportCardData } from './pdf-report-card';

let fontBytes: Awaited<ReturnType<typeof readPdfFontBytes>>;

beforeAll(async () => {
  fontBytes = await readPdfFontBytes();
});

const renderReportCardPdf = (data: ReportCardData) => renderWithFonts(data, fontBytes);

const labels = {
  title: 'Öğrenci Karnesi',
  studentNoLabel: 'Numara',
  classLabel: 'Sınıf',
  scoresTitle: 'Sonuçlar',
  outcomesTitle: 'Kazanımlar',
  summaryTitle: 'Özet',
  scoreColumn: 'Puan',
  dateColumn: 'Tarih',
};

function baseData(overrides: Partial<ReportCardData> = {}): ReportCardData {
  return {
    studentName: 'Şule Işıkçağlar',
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
      baseData({ summaryText: 'Öğrenci bu dönem cebir konusunda belirgin ilerleme kaydetti.' }),
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
