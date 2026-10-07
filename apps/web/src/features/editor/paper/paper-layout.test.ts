// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import { createTextMeasure } from '@testcim/pdf-fonts';
import { readPdfFontBytes } from '@testcim/pdf-fonts/node';
import type { PaintCommand } from '@testcim/renderers';
import { resolveHeaderSettings, type TestHeaderSettings } from '@testcim/shared';

import {
  buildLayoutHeader,
  buildPaperLayout,
  type PaperItem,
  type PaperLabels,
  type PaperLayoutInput,
} from './paper-layout';

const labels: PaperLabels = {
  defaultSchool: 'Atatürk Ortaokulu',
  defaultSubject: 'Matematik',
  defaultClass: '8-A',
  defaultTerm: '2024-2025 Eğitim-Öğretim Yılı',
  defaultTitle: '1. Dönem 1. Yazılı Sınavı',
  studentName: 'Adı Soyadı',
  classAndNo: 'Sınıf / No',
  score: 'Puan',
  teacher: 'Öğretmen',
  duration: 'Süre',
  durationMinutes: (minutes) => `${minutes} dk`,
  subjectLine: (subject) => `${subject} Dersi`,
  classLine: (className) => `${className} Sınıfı`,
  pointsSuffix: 'puan',
  answerSheetTitle: 'Cevap Formu',
  answerKeyTitle: 'Cevap Anahtarı',
  footerBrand: 'Testcim',
  pageLabel: 'Sayfa {page} / {total}',
};

let measure: ReturnType<typeof createTextMeasure>;

beforeAll(async () => {
  measure = createTextMeasure(await readPdfFontBytes());
});

function items(count: number, extra: Partial<PaperItem> = {}): PaperItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    imageUrl: `https://files.test/${index}.png`,
    points: null,
    correct: { question_type: 'mcq' as const, option_id: 'ABCDE'[index % 5] as string },
    ...extra,
  }));
}

function layout(
  overrides: Omit<Partial<PaperLayoutInput>, 'header'> & {
    header?: Partial<TestHeaderSettings>;
  } = {},
) {
  const { header, ...rest } = overrides;
  return buildPaperLayout({
    items: items(12),
    sizes: new Map(),
    header: { ...resolveHeaderSettings(undefined, 'Yazılı'), ...header },
    title: 'Yazılı',
    settings: null,
    labels,
    measure,
    ...rest,
  });
}

const textsOf = (commands: readonly PaintCommand[]) =>
  commands.flatMap((command) => (command.type === 'text' ? [command.text] : []));

describe('buildLayoutHeader', () => {
  const base = resolveHeaderSettings(undefined, 'Yazılı');

  it('reads term, subject, class and title in the classic preset, without the term otherwise', () => {
    const classic = buildLayoutHeader({ ...base, layoutPreset: 'classic' }, 'Yazılı', labels);
    expect(classic.metaLine).toBe(
      '2024-2025 Eğitim-Öğretim Yılı - Matematik Dersi - 8-A Sınıfı - Yazılı',
    );
    const modern = buildLayoutHeader({ ...base, layoutPreset: 'modern' }, 'Yazılı', labels);
    expect(modern.metaLine).toBe('Matematik Dersi - 8-A Sınıfı - Yazılı');
  });

  it('falls back to the defaults for empty fields and drops empty details', () => {
    const header = buildLayoutHeader(
      {
        ...base,
        schoolName: '',
        subject: '',
        className: '',
        teacherName: '',
        duration: '',
        title: '',
      },
      '',
      labels,
    );
    expect(header.schoolName).toBe('Atatürk Ortaokulu');
    expect(header.metaLine).toContain('Matematik');
    expect(header.metaLine).toContain('1. Dönem 1. Yazılı Sınavı');
    expect(header.detailLines).toEqual([]);
  });

  it('lists teacher and duration, and honours the student field switches', () => {
    const header = buildLayoutHeader(
      { ...base, teacherName: 'Şule Işık', duration: '40' },
      'Y',
      labels,
    );
    expect(header.detailLines).toEqual(['Öğretmen: Şule Işık', 'Süre: 40 dk']);
    expect(header.studentFields).toEqual(['Adı Soyadı', 'Sınıf / No', 'Puan']);

    expect(
      buildLayoutHeader({ ...base, showStudentInfo: false }, 'Y', labels).studentFields,
    ).toEqual([]);
    expect(
      buildLayoutHeader({ ...base, showStudentName: false, showScore: false }, 'Y', labels)
        .studentFields,
    ).toEqual(['Sınıf / No']);
  });

  it('shows the booklet code only when asked', () => {
    expect(
      buildLayoutHeader({ ...base, showBookletCode: false }, 'Y', labels).bookletCode,
    ).toBeNull();
    expect(
      buildLayoutHeader({ ...base, showBookletCode: true, bookletCode: 'C' }, 'Y', labels)
        .bookletCode,
    ).toBe('C');
  });
});

describe('buildPaperLayout', () => {
  it('lays every question out exactly once, in order, with its image', () => {
    const result = layout({ items: items(30) });
    const images = result.pages
      .slice(0, result.questionPageCount)
      .flatMap((page) => page.commands.flatMap((c) => (c.type === 'image' ? [c.key] : [])));
    expect(images.slice().sort()).toEqual(
      items(30)
        .map((item) => item.id)
        .sort(),
    );

    const numbers = result.pages.flatMap((page) =>
      textsOf(page.commands).filter((text) => /^\d+\.$/.test(text)),
    );
    expect(numbers).toEqual(Array.from({ length: 30 }, (_, index) => `${index + 1}.`));
  });

  it('uses the real image shape when known, and a typical one until then', () => {
    const tall = new Map(items(12).map((item) => [item.imageUrl, { width: 400, height: 1200 }]));
    const wide = new Map(items(12).map((item) => [item.imageUrl, { width: 1600, height: 200 }]));

    expect(layout({ sizes: tall }).questionPageCount).toBeGreaterThan(
      layout({ sizes: wide }).questionPageCount,
    );
    expect(layout({ sizes: new Map() }).questionPageCount).toBe(
      layout({ sizes: new Map() }).questionPageCount,
    );
  });

  it('spaces questions by the chosen spacing and uses one or two columns', () => {
    const tight = layout({ items: items(40), header: { questionSpacing: 'tight' } });
    const detailed = layout({ items: items(40), header: { questionSpacing: 'detailed' } });
    expect(detailed.questionPageCount).toBeGreaterThanOrEqual(tight.questionPageCount);

    const one = layout({
      items: items(8),
      settings: { columns: 1, layoutMode: 'strict', fitPagesScaleMin: 0.85 },
    });
    const two = layout({ items: items(8) });
    expect(one.columns).toBe(1);
    expect(two.columns).toBe(2);
    expect(one.questionPageCount).toBeGreaterThanOrEqual(two.questionPageCount);
  });

  it('prints points beside the questions that have them', () => {
    const result = layout({ items: items(3, { points: 5 }) });
    const labelsDrawn = result.pages.flatMap((page) =>
      textsOf(page.commands).filter((text) => text === '(5 puan)'),
    );
    expect(labelsDrawn).toHaveLength(3);
  });

  it('adds the answer sheet and the answer key, reading letters from the key', () => {
    const result = layout({
      items: items(6),
      header: { showAnswerSheet: true, showAnswerKey: true },
    });
    expect(result.pages.length).toBe(result.questionPageCount + 2);
    const keyPage = textsOf(result.pages[result.pages.length - 1]!.commands);
    expect(keyPage).toContain('Cevap Anahtarı');
    expect(keyPage.slice(keyPage.indexOf('Cevap Anahtarı'))).toEqual(
      expect.arrayContaining(['A', 'B', 'C', 'D', 'E']),
    );
  });

  it('has no extra pages for an empty test even when they are switched on', () => {
    const result = layout({ items: [], header: { showAnswerSheet: true, showAnswerKey: true } });
    expect(result.pages).toHaveLength(1);
    expect(result.questionPageCount).toBe(1);
  });

  it('leaves a frame instead of an image for a question with no image yet', () => {
    const result = layout({ items: [{ ...items(1)[0]!, imageUrl: '' }] });
    expect(result.pages[0]!.commands.some((c) => c.type === 'image')).toBe(false);
    expect(result.pages[0]!.commands.some((c) => c.type === 'rect')).toBe(true);
  });

  it('hides the column divider when the header says so', () => {
    const dividers = (header: Partial<TestHeaderSettings>) =>
      layout({ items: items(20), header })
        .pages.flatMap((page) => page.commands)
        .filter((c) => c.type === 'line' && c.x1 === c.x2).length;
    expect(dividers({ showColumnDivider: true })).toBeGreaterThan(0);
    expect(dividers({ showColumnDivider: false })).toBe(0);
  });

  it('honours the flexible and fit-pages modes from the test settings', () => {
    const flexible = layout({
      items: items(30),
      settings: { columns: 2, layoutMode: 'flexible', fitPagesScaleMin: 0.85 },
    });
    expect(flexible.questionPageCount).toBeGreaterThan(0);

    const strict = layout({ items: items(30) });
    const fitted = layout({
      items: items(30),
      settings: {
        columns: 2,
        layoutMode: 'fit-pages',
        fitPagesTarget: Math.max(1, strict.questionPageCount - 1),
        fitPagesScaleMin: 0.85,
      },
    });
    expect(fitted.questionPageCount).toBeLessThanOrEqual(strict.questionPageCount);
  });

  it('keeps the frame the engine reserved identical to the one that is drawn', () => {
    const result = layout({ items: items(20) });
    const m = result.document.metrics;
    const firstImageY = Math.min(
      ...result.pages[0]!.commands.flatMap((c) => (c.type === 'image' ? [c.y] : [])),
    );
    expect(firstImageY).toBeGreaterThanOrEqual(m.marginsMm.top + m.headerHeightMm - 0.01);
  });
});
