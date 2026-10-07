import { readFileSync } from 'node:fs';

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';

import { paintTest } from './paint';
import { PAINT_CSS_VAR, PAINT_RGB } from './paint-colors';
import { paintFixture, TINY_PNG } from './paint-fixtures';
import { escapeHtml, renderPaintHtml } from './paint-html';
import { renderPaintPdf, type PdfImageInput } from './paint-pdf';

import type { PaintColor, PaintPage } from './paint-types';

async function readPdf(bytes: Uint8Array) {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const pages = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number);
    const content = await page.getTextContent();
    const operators = await page.getOperatorList();
    pages.push({
      text: content.items.map((item) => ('str' in item ? item.str : '')).join(' '),
      images: operators.fnArray.filter((fn) => fn === OPS.paintImageXObject).length,
    });
  }
  return pages;
}

function imageMap(keys: readonly string[]): Map<string, PdfImageInput> {
  return new Map(keys.map((key) => [key, { bytes: TINY_PNG, format: 'png' as const }]));
}

describe('renderPaintPdf', () => {
  it('draws Turkish text, every question image and the page numbers, read back from the PDF', async () => {
    const { result, content, fontBytes, itemIds } = await paintFixture({ count: 14 });
    const paintPages = paintTest(result.document, content);
    const bytes = await renderPaintPdf(paintPages, imageMap(itemIds), fontBytes, {
      title: 'Sınav',
    });

    const pages = await readPdf(bytes);
    expect(pages).toHaveLength(paintPages.length);

    expect(pages[0]!.text).toContain('Atatürk Ortaokulu');
    expect(pages[0]!.text).toContain('Öğretmen: Şule Işıkçağlar');
    expect(pages[0]!.text).toContain('Adı Soyadı:');
    expect(pages[0]!.text).toContain('Sınav süresi 40 dakikadır. Başarılar dileriz.');
    expect(pages[1]!.text).toContain(`Sayfa 2 / ${pages.length}`);

    expect(pages.reduce((sum, page) => sum + page.images, 0)).toBe(14);
  });

  it('matches the page size and keeps a one-page test small thanks to font subsetting', async () => {
    const { result, content, fontBytes, itemIds } = await paintFixture({ count: 3 });
    const bytes = await renderPaintPdf(
      paintTest(result.document, content),
      imageMap(itemIds),
      fontBytes,
    );

    const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
    const view = (await doc.getPage(1)).view;
    expect(view[2]! - view[0]!).toBeCloseTo((210 * 72) / 25.4, 1);
    expect(view[3]! - view[1]!).toBeCloseTo((297 * 72) / 25.4, 1);
    expect(bytes.byteLength).toBeLessThan(150_000);
  });

  it('leaves the frame empty for a question whose image is missing instead of failing', async () => {
    const { result, content, fontBytes } = await paintFixture({ count: 3 });
    const bytes = await renderPaintPdf(paintTest(result.document, content), new Map(), fontBytes);
    const pages = await readPdf(bytes);
    expect(pages[0]!.images).toBe(0);
    expect(pages[0]!.text).toContain('Atatürk Ortaokulu');
  });

  it('renders answer sheet and answer key pages and a rotated watermark', async () => {
    const { result, content, fontBytes, itemIds } = await paintFixture({
      count: 4,
      watermark: true,
      extras: [
        {
          kind: 'answerSheet',
          title: 'Cevap Kâğıdı',
          optionLetters: ['A', 'B', 'C', 'D'],
          count: 4,
        },
        { kind: 'answerKey', title: 'Cevap Anahtarı', answers: ['A', 'B', 'C', 'D'] },
      ],
    });
    const bytes = await renderPaintPdf(
      paintTest(result.document, content),
      imageMap(itemIds),
      fontBytes,
    );
    const pages = await readPdf(bytes);

    const last = pages.slice(-2);
    expect(last[0]!.text).toContain('Cevap Kâğıdı');
    expect(last[1]!.text).toContain('Cevap Anahtarı');
    expect(pages[0]!.text).toContain('ÖRNEK');
  });
});

describe('renderPaintHtml', () => {
  const page = (commands: PaintPage['commands']): PaintPage => ({
    widthMm: 210,
    heightMm: 297,
    commands,
  });

  it('produces one absolutely positioned section per page, in millimetres', async () => {
    const { result, content } = await paintFixture({ count: 14 });
    const paintPages = paintTest(result.document, content);
    const html = renderPaintHtml(paintPages, {
      imageSrc: (key) => `https://files.example.test/${key}.png`,
    });

    expect(html).toHaveLength(paintPages.length);
    for (const section of html) {
      expect(section.startsWith('<section data-paper-sheet=""')).toBe(true);
      expect(section).toContain('width:210mm;height:297mm');
    }
    expect(html[0]).toContain('Atatürk Ortaokulu');
    expect(html[0]).toContain('src="https://files.example.test/i0.png"');
  });

  it('escapes free text from the header so it cannot inject markup', () => {
    const [html] = renderPaintHtml(
      [
        page([
          {
            type: 'text',
            x: 0,
            y: 0,
            w: 100,
            text: '<img src=x onerror=alert(1)> & "ok"',
            sizePt: 10,
            weight: 'regular',
            align: 'left',
            color: 'ink',
          },
        ]),
      ],
      { imageSrc: () => null },
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;ok&quot;');
    expect(escapeHtml(`'`)).toBe('&#39;');
  });

  it('only lets safe image addresses through', () => {
    const image = { type: 'image' as const, x: 0, y: 0, w: 10, h: 10, key: 'k' };
    const render = (src: string | null) =>
      renderPaintHtml([page([image])], { imageSrc: () => src })[0]!;

    expect(render('https://x.test/a.png')).toContain('<img');
    expect(render('blob:https://x.test/uuid')).toContain('<img');
    expect(render('data:image/png;base64,AAAA')).toContain('<img');
    expect(render('javascript:alert(1)')).not.toContain('<img');
    expect(render('data:text/html;base64,AAAA')).not.toContain('<img');
    expect(render('//evil.test/a.png')).not.toContain('<img');
    expect(render(null)).not.toContain('<img');
  });

  it('draws lines, frames and rotated text the same way the PDF does', () => {
    const [html] = renderPaintHtml(
      [
        page([
          {
            type: 'line',
            x1: 10,
            y1: 20,
            x2: 110,
            y2: 20,
            widthMm: 0.2,
            color: 'line',
            dotted: true,
          },
          { type: 'line', x1: 50, y1: 10, x2: 50, y2: 90, widthMm: 0.2, color: 'line' },
          { type: 'rect', x: 5, y: 6, w: 7, h: 8, strokeMm: 0.25, stroke: 'ink', fill: null },
          {
            type: 'text',
            x: 3,
            y: 4,
            w: 50,
            text: 'ÖRNEK',
            sizePt: 28,
            weight: 'semibold',
            align: 'center',
            color: 'ink3',
            rotateDeg: 30,
            opacity: 0.1,
          },
        ]),
      ],
      { imageSrc: () => null },
    );
    expect(html).toContain('border-top:0.2mm dotted var(--color-line)');
    expect(html).toContain('border-left:0.2mm solid var(--color-line)');
    expect(html).toContain('border:0.25mm solid var(--color-ink)');
    expect(html).toContain('transform:rotate(-30deg)');
    expect(html).toContain('opacity:0.1');
    expect(html).toContain('font-weight:600');
  });

  it('refuses a diagonal line rather than drawing it wrong', () => {
    expect(() =>
      renderPaintHtml(
        [page([{ type: 'line', x1: 0, y1: 0, x2: 5, y2: 5, widthMm: 0.2, color: 'line' }])],
        { imageSrc: () => null },
      ),
    ).toThrow(RangeError);
  });
});

describe('paper palette', () => {
  const tokens = readFileSync(
    new URL('../../../apps/web/src/styles/tokens.css', import.meta.url),
    'utf8',
  );
  const tokenName: Record<PaintColor, string> = {
    surface: '--color-surface',
    ink: '--color-ink',
    ink2: '--color-ink-2',
    ink3: '--color-ink-3',
    line: '--color-line',
    lineStrong: '--color-line-strong',
    accent: '--color-accent',
  };

  it('matches the colour tokens in tokens.css, so print and screen use the same colours', () => {
    for (const [color, name] of Object.entries(tokenName) as [PaintColor, string][]) {
      const match = new RegExp(`${name}:\\s*#([0-9a-fA-F]{6})\\b`).exec(tokens);
      expect(match, name).not.toBeNull();
      const hex = match![1]!;
      const expected = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
      expect([...PAINT_RGB[color]], color).toEqual(expected);
      expect(PAINT_CSS_VAR[color]).toBe(`var(${name})`);
    }
  });
});
