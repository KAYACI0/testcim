import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fitLine, frameMetrics, paintTest, wrapText } from './paint';
import { FOOTER, HEADER, paintFixture } from './paint-fixtures';

import type { PaintCommand } from './paint-types';

type TextCommand = Extract<PaintCommand, { type: 'text' }>;

const texts = (commands: readonly PaintCommand[]): TextCommand[] =>
  commands.filter((command): command is TextCommand => command.type === 'text');
const textValues = (commands: readonly PaintCommand[]): string[] =>
  texts(commands).map((command) => command.text);

describe('frameMetrics', () => {
  it('measures the header by drawing it, so the engine reserves exactly the space it takes', async () => {
    const { content } = await paintFixture();
    const classic = frameMetrics(HEADER, FOOTER, 186, content.measure);
    const minimal = frameMetrics(
      {
        ...HEADER,
        preset: 'minimal',
        schoolName: '',
        metaLine: '',
        detailLines: [],
        instructions: '',
      },
      FOOTER,
      186,
      content.measure,
    );
    const withoutInstructions = frameMetrics(
      { ...HEADER, instructions: '' },
      FOOTER,
      186,
      content.measure,
    );

    expect(classic.headerHeightMm).toBeGreaterThan(withoutInstructions.headerHeightMm);
    expect(classic.headerHeightMm).toBeGreaterThan(minimal.headerHeightMm);
    expect(classic.continuationHeaderHeightMm).toBeLessThan(classic.headerHeightMm);
    expect(classic.footerHeightMm).toBeGreaterThan(3);
  });

  it('grows when the instructions wrap onto more lines', async () => {
    const { content } = await paintFixture();
    const short = frameMetrics(HEADER, FOOTER, 186, content.measure);
    const long = frameMetrics(
      { ...HEADER, instructions: 'Lütfen soruları dikkatle okuyunuz. '.repeat(12) },
      FOOTER,
      186,
      content.measure,
    );
    expect(long.headerHeightMm).toBeGreaterThan(short.headerHeightMm);
  });
});

describe('paintTest', () => {
  it('draws the full header on page one and the compact one afterwards', async () => {
    const { result, content } = await paintFixture({ count: 14 });
    const pages = paintTest(result.document, content);
    expect(pages.length).toBeGreaterThan(1);

    const first = textValues(pages[0]!.commands);
    expect(first).toContain('Atatürk Ortaokulu');
    expect(first.some((value) => value.includes('1. Dönem Yazılı Sınavı'))).toBe(true);
    expect(first).toContain('Adı Soyadı:');
    expect(first).toContain('Sınav süresi 40 dakikadır. Başarılar dileriz.');

    const second = textValues(pages[1]!.commands);
    expect(second).not.toContain('Adı Soyadı:');
    expect(second).toContain('Atatürk Ortaokulu');
    expect(second).toContain(`Sayfa 2 / ${pages.length}`);
  });

  it('puts the footer and the page number on every page', async () => {
    const { result, content } = await paintFixture({ count: 14 });
    const pages = paintTest(result.document, content);
    pages.forEach((page, index) => {
      const values = textValues(page.commands);
      expect(values).toContain('Testcim ile hazırlandı');
      expect(values).toContain(`Sayfa ${index + 1} / ${pages.length}`);
    });
  });

  it('draws every question once with its number and image, below the header and above the footer', async () => {
    const { result, content, itemIds } = await paintFixture({ count: 14 });
    const pages = paintTest(result.document, content);
    const m = result.document.metrics;

    const keys = pages.flatMap((page) =>
      page.commands.flatMap((command) => (command.type === 'image' ? [command.key] : [])),
    );
    expect([...keys].sort()).toEqual([...itemIds].sort());

    const numbers = pages.flatMap((page) =>
      textValues(page.commands).filter((value) => /^\d+\.$/.test(value)),
    );
    expect(numbers).toEqual(Array.from({ length: 14 }, (_, index) => `${index + 1}.`));

    pages.forEach((page, pageIndex) => {
      const top =
        m.marginsMm.top + (pageIndex === 0 ? m.headerHeightMm : m.continuationHeaderHeightMm);
      const bottom = result.document.heightMm - m.marginsMm.bottom - m.footerHeightMm;
      for (const command of page.commands) {
        if (command.type === 'image') {
          expect(command.y).toBeGreaterThanOrEqual(top - 0.01);
          expect(command.y + command.h).toBeLessThanOrEqual(bottom + 0.01);
        }
      }
    });
  });

  it('prints points in the right gutter only when questions have points', async () => {
    const without = await paintFixture({ count: 4 });
    const plain = paintTest(without.result.document, without.content).flatMap((p) => p.commands);
    expect(textValues(plain)).not.toContain('2 puan');

    const withPoints = await paintFixture({ count: 4, withPoints: true });
    const labels = texts(
      paintTest(withPoints.result.document, withPoints.content).flatMap((p) => p.commands),
    ).filter((command) => command.text === '2 puan');
    expect(labels).toHaveLength(4);
    expect(labels.every((command) => command.align === 'right')).toBe(true);
  });

  it('draws a column divider only where both columns are used, and not when disabled', async () => {
    const dividers = (commands: readonly PaintCommand[]) =>
      commands.filter((command) => command.type === 'line' && command.x1 === command.x2);

    const full = await paintFixture({ count: 14 });
    const pages = paintTest(full.result.document, full.content);
    expect(dividers(pages[0]!.commands)).toHaveLength(1);

    const off = await paintFixture({ count: 14, showColumnDivider: false });
    expect(
      paintTest(off.result.document, off.content).flatMap((page) => dividers(page.commands)),
    ).toHaveLength(0);

    const single = await paintFixture({ count: 2 });
    expect(dividers(paintTest(single.result.document, single.content)[0]!.commands)).toHaveLength(
      0,
    );
  });

  it('appends answer sheet and answer key pages and counts them in the page numbers', async () => {
    const { result, content } = await paintFixture({
      count: 6,
      extras: [
        {
          kind: 'answerSheet',
          title: 'Cevap Kâğıdı',
          optionLetters: ['A', 'B', 'C', 'D', 'E'],
          count: 6,
        },
        { kind: 'answerKey', title: 'Cevap Anahtarı', answers: ['A', 'C', 'B', 'D', 'E', 'A'] },
      ],
    });
    const pages = paintTest(result.document, content);
    const questionPages = result.document.pages.length;
    expect(pages).toHaveLength(questionPages + 2);

    expect(textValues(pages[questionPages]!.commands)).toContain('Cevap Kâğıdı');
    const keyValues = textValues(pages[questionPages + 1]!.commands);
    expect(keyValues).toContain('Cevap Anahtarı');
    expect(keyValues).toContain(`Sayfa ${pages.length} / ${pages.length}`);
    expect(keyValues.filter((value) => value === 'A')).toHaveLength(2);
  });

  it('splits a long answer sheet over several pages without losing a row', async () => {
    const { result, content } = await paintFixture({
      count: 2,
      extras: [
        {
          kind: 'answerSheet',
          title: 'Cevap Kâğıdı',
          optionLetters: ['A', 'B', 'C', 'D'],
          count: 230,
        },
      ],
    });
    const pages = paintTest(result.document, content).slice(result.document.pages.length);
    expect(pages.length).toBeGreaterThan(1);
    const numbers = pages.flatMap((page) =>
      textValues(page.commands).filter((value) => /^\d+\.$/.test(value)),
    );
    expect(numbers).toEqual(Array.from({ length: 230 }, (_, index) => `${index + 1}.`));
  });

  it('tiles a watermark behind everything on every page', async () => {
    const { result, content } = await paintFixture({ count: 3, watermark: true });
    for (const page of paintTest(result.document, content)) {
      const marks = texts(page.commands).filter((command) => command.text === 'ÖRNEK');
      expect(marks.length).toBeGreaterThan(4);
      expect(marks.every((mark) => mark.rotateDeg === 30 && mark.opacity === 0.1)).toBe(true);
      expect(page.commands[0]).toEqual(marks[0]);
    }
  });

  it('draws the booklet code as a boxed letter', async () => {
    const { result, content } = await paintFixture({
      count: 2,
      header: { ...HEADER, bookletCode: 'B' },
    });
    const first = paintTest(result.document, content)[0]!.commands;
    expect(textValues(first)).toContain('B');
    expect(first.some((command) => command.type === 'rect' && command.stroke === 'ink')).toBe(true);
  });

  it('is deterministic', async () => {
    const { result, content } = await paintFixture({ count: 20 });
    expect(paintTest(result.document, content)).toEqual(paintTest(result.document, content));
  });
});

describe('text fitting', () => {
  it('wrapText keeps every word, in order, and never overflows a line that can hold its words', async () => {
    const { content } = await paintFixture({ count: 1 });
    const words = fc.array(
      fc.constantFrom('Öğrenci', 'ığşİĞŞ', 'sınav', 'çözümlü', 'a', 'Matematik', 'x'.repeat(40)),
      { minLength: 1, maxLength: 30 },
    );

    fc.assert(
      fc.property(words, fc.double({ min: 20, max: 160, noNaN: true }), (list, width) => {
        const lines = wrapText(list.join(' '), width, 9, 'regular', content.measure);
        expect(lines.join('').replace(/\s/g, '')).toBe(list.join('').replace(/\s/g, ''));
        for (const line of lines) {
          if ([...line].length > 1) {
            expect(content.measure(line, 9, 'regular')).toBeLessThanOrEqual(width + 1e-6);
          }
        }
      }),
    );
  });

  it('fitLine returns a line that fits, ellipsized only when it had to be cut', async () => {
    const { content } = await paintFixture({ count: 1 });
    expect(fitLine('Kısa', 100, 9, 'regular', content.measure)).toBe('Kısa');
    const cut = fitLine('Çok uzun bir başlık '.repeat(10), 50, 9, 'regular', content.measure);
    expect(cut.endsWith('…')).toBe(true);
    expect(content.measure(cut, 9, 'regular')).toBeLessThanOrEqual(50);
  });
});
