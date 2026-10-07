import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { renderTestDocx, type ExportQuestion } from './docx-export';
import { fitInside, toBase64 } from './export-image';
import { TINY_PNG } from './paint-fixtures';

const EMU_PER_PX = 9525;

async function documentXml(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  return zip.file('word/document.xml')!.async('string');
}

function extents(xml: string): { cx: number; cy: number }[] {
  return [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)].map((match) => ({
    cx: Number(match[1]),
    cy: Number(match[2]),
  }));
}

const plainQuestion: ExportQuestion = {
  number: 1,
  stemText: 'İkinin ikiye bölümü kaçtır?',
  options: [
    { label: 'A', text: '1' },
    { label: 'B', text: '2' },
  ],
};

const picture = (width: number, height: number, format: 'png' | 'jpeg' = 'png') => ({
  bytes: TINY_PNG,
  format,
  width,
  height,
});

describe('renderTestDocx', () => {
  it('writes the title, class and Turkish question text into the document', async () => {
    const xml = await documentXml(
      await renderTestDocx({
        title: 'Matematik Sınavı',
        className: '9-A',
        questions: [plainQuestion],
        correctAnswerLabel: 'Doğru cevap',
      }),
    );
    expect(xml).toContain('Matematik Sınavı');
    expect(xml).toContain('9-A');
    expect(xml).toContain('İkinin ikiye bölümü kaçtır?');
    expect(xml).toContain('A) 1');
  });

  it('prints the answer line only for questions that carry a correct label', async () => {
    const xml = await documentXml(
      await renderTestDocx({
        title: 'Sınav',
        questions: [
          { ...plainQuestion, correctLabel: 'B' },
          { ...plainQuestion, number: 2 },
        ],
        correctAnswerLabel: 'Doğru cevap',
      }),
    );
    expect(xml.match(/Doğru cevap: B/g)).toHaveLength(1);
  });

  it('embeds a question picture at its own shape instead of stretching it', async () => {
    const xml = await documentXml(
      await renderTestDocx({
        title: 'Sınav',
        questions: [
          { number: 1, stemImage: picture(2000, 500), options: [] },
          { number: 2, stemImage: picture(800, 1600), options: [] },
        ],
        correctAnswerLabel: 'Doğru cevap',
      }),
    );
    const [wide, tall] = extents(xml);
    expect(wide!.cx / wide!.cy).toBeCloseTo(2000 / 500, 1);
    expect(tall!.cx / tall!.cy).toBeCloseTo(800 / 1600, 1);
    // Never wider than the page text, never taller than the page.
    expect(wide!.cx / EMU_PER_PX).toBeLessThanOrEqual(600.5);
    expect(tall!.cy / EMU_PER_PX).toBeLessThanOrEqual(880.5);
  });

  it('does not blow a small picture up past its natural size', async () => {
    const xml = await documentXml(
      await renderTestDocx({
        title: 'Sınav',
        questions: [{ number: 1, stemImage: picture(200, 100), options: [] }],
        correctAnswerLabel: 'x',
      }),
    );
    expect(extents(xml)[0]!.cx / EMU_PER_PX).toBeCloseTo(200, 0);
  });

  it('embeds PNG and JPEG pictures as media files and picture options beside their label', async () => {
    const bytes = await renderTestDocx({
      title: 'Sınav',
      questions: [
        {
          number: 1,
          stemImage: picture(600, 200, 'jpeg'),
          options: [{ label: 'A', image: picture(300, 60) }],
        },
      ],
      correctAnswerLabel: 'x',
    });
    const zip = await JSZip.loadAsync(bytes);
    const media = Object.keys(zip.files).filter((name) => name.startsWith('word/media/'));
    expect(media.some((name) => name.endsWith('.jpg'))).toBe(true);
    expect(media.some((name) => name.endsWith('.png'))).toBe(true);
    expect(await documentXml(bytes)).toContain('A) ');
  });

  it('adds a text watermark header when asked', async () => {
    const zip = await JSZip.loadAsync(
      await renderTestDocx({
        title: 'Sınav',
        questions: [plainQuestion],
        correctAnswerLabel: 'x',
        watermarkText: 'TASLAK',
      }),
    );
    const headers = Object.keys(zip.files).filter((name) => /^word\/header\d*\.xml$/.test(name));
    expect(headers.length).toBeGreaterThan(0);
    const texts = await Promise.all(headers.map((name) => zip.file(name)!.async('string')));
    expect(texts.join('')).toContain('TASLAK');
  });
});

describe('export image helpers', () => {
  it('fitInside keeps the shape, shrinks to the box and respects the scale cap', () => {
    expect(fitInside({ width: 2000, height: 1000 }, 600, 880)).toEqual({ width: 600, height: 300 });
    expect(fitInside({ width: 400, height: 2000 }, 600, 500)).toEqual({ width: 100, height: 500 });
    expect(fitInside({ width: 100, height: 50 }, 600, 880)).toEqual({ width: 100, height: 50 });
    expect(fitInside({ width: 100, height: 50 }, 600, 880, 2)).toEqual({ width: 200, height: 100 });
    expect(() => fitInside({ width: 0, height: 10 }, 10, 10)).toThrow(RangeError);
  });

  it('toBase64 matches Buffer without using it, even for large inputs', () => {
    const bytes = Uint8Array.from({ length: 100_000 }, (_, index) => (index * 31) % 256);
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    expect(toBase64(new Uint8Array())).toBe('');
  });
});
