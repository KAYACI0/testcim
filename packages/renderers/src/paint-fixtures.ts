import {
  layoutTest,
  type LayoutHeader,
  type LayoutInput,
  type LayoutItemInput,
  type LayoutResult,
} from '@testcim/layout-engine';
import { createTextMeasure, type PdfFontBytes } from '@testcim/pdf-fonts';
import { readPdfFontBytes } from '@testcim/pdf-fonts/node';

import { frameMetrics, questionImageHeightMm } from './paint';

import type { TestPaintContent } from './paint-types';

/** A 1x1 PNG, enough to prove an image is embedded and drawn. */
export const TINY_PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
);

export const HEADER: LayoutHeader = {
  preset: 'classic',
  schoolName: 'Atatürk Ortaokulu',
  metaLine: '2026-2027 Eğitim-Öğretim Yılı - Matematik - 8-A - 1. Dönem Yazılı Sınavı',
  detailLines: ['Öğretmen: Şule Işıkçağlar', 'Süre: 40 dakika'],
  instructions: 'Sınav süresi 40 dakikadır. Başarılar dileriz.',
  studentFields: ['Adı Soyadı', 'Sınıfı / No', 'Puan'],
  compactLine: 'Matematik - 8-A - 1. Dönem Yazılı Sınavı',
  bookletCode: null,
};

export const FOOTER = {
  brandingLine: 'Testcim ile hazırlandı',
  pageLabel: 'Sayfa {page} / {total}',
};

export interface PaintFixture {
  readonly fontBytes: PdfFontBytes;
  readonly result: LayoutResult;
  readonly content: TestPaintContent;
  readonly itemIds: readonly string[];
}

export async function paintFixture(
  options: {
    readonly count?: number;
    readonly header?: LayoutHeader;
    readonly columns?: 1 | 2 | 3;
    readonly showColumnDivider?: boolean;
    readonly extras?: TestPaintContent['extras'];
    readonly withPoints?: boolean;
    readonly watermark?: boolean;
  } = {},
): Promise<PaintFixture> {
  const fontBytes = await readPdfFontBytes();
  const measure = createTextMeasure(fontBytes);
  const count = options.count ?? 12;
  const columns = options.columns ?? 2;
  const header = options.header ?? HEADER;
  const withPoints = options.withPoints ?? false;

  const widthMm = 210;
  const margins = { top: 12, bottom: 12, left: 12, right: 12 };
  const contentWidth = widthMm - margins.left - margins.right;
  const columnGap = 8;
  const columnWidth = (contentWidth - columnGap * (columns - 1)) / columns;

  const base = { numberGutterMm: 8, pointsGutterMm: withPoints ? 16 : 0 };
  const frame = frameMetrics(header, FOOTER, contentWidth, measure);

  const items: LayoutItemInput[] = Array.from({ length: count }, (_, index) => ({
    id: `i${index}`,
    questionId: `q${index}`,
    sectionId: null,
    groupId: null,
    pinned: false,
    kind: 'image',
    questionType: 'mcq',
    optionIds: [],
    correct: null,
  }));

  const input: LayoutInput = {
    items,
    groups: [],
    sections: [],
    header,
    footer: FOOTER,
    ...(options.watermark ? { watermark: { text: 'ÖRNEK', angle: 30, opacity: 0.1 } } : {}),
    settings: {
      pageSize: 'A4',
      orientation: 'portrait',
      columns,
      marginsMm: margins,
      columnGapMm: columnGap,
      questionGapMm: 5.3,
      ...frame,
      mode: 'strict',
      fitPagesScaleMin: 1,
      columnBalance: false,
      lookahead: 0,
    },
    seed: 1,
    versionCode: 'A',
    measure: {
      item: (id) =>
        questionImageHeightMm(columnWidth, base, 800, 300 + (Number(id.slice(1)) % 4) * 90),
      passage: () => 0,
    },
  };

  const content: TestPaintContent = {
    measure,
    ...base,
    pointsLabels: withPoints ? new Map(items.map((item) => [item.id, '2 puan'])) : new Map(),
    imageKeys: new Set(items.map((item) => item.id)),
    showColumnDivider: options.showColumnDivider ?? true,
    extras: options.extras ?? [],
  };

  return { fontBytes, result: layoutTest(input), content, itemIds: items.map((item) => item.id) };
}
