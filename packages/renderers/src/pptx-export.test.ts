import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { TINY_PNG } from './paint-fixtures';
import { renderTestPptx, type PptxQuestion } from './pptx-export';

const EMU_PER_INCH = 914400;
/** The default 16:9 slide: 10 x 5.625 inches. */
const SLIDE_WIDTH = 10 * EMU_PER_INCH;
const SLIDE_HEIGHT = 5.625 * EMU_PER_INCH;

async function slides(bytes: Uint8Array): Promise<{ names: string[]; xml: string[] }> {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  return { names, xml: await Promise.all(names.map((name) => zip.file(name)!.async('string'))) };
}

function boxes(xml: string): { x: number; y: number; cx: number; cy: number }[] {
  return [
    ...xml.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/g),
  ].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
    cx: Number(match[3]),
    cy: Number(match[4]),
  }));
}

const picture = (width: number, height: number, format: 'png' | 'jpeg' = 'png') => ({
  bytes: TINY_PNG,
  format,
  width,
  height,
});

const plainQuestion: PptxQuestion = {
  number: 1,
  stemText: 'İkinin ikiye bölümü kaçtır?',
  options: [
    { label: 'A', text: '1' },
    { label: 'B', text: '2' },
  ],
};

describe('renderTestPptx', () => {
  it('makes a title slide plus one slide per question, with the Turkish text in place', async () => {
    const { xml } = await slides(
      await renderTestPptx({
        title: 'Matematik Sınavı',
        className: '9-A',
        questions: [plainQuestion, { ...plainQuestion, number: 2 }],
        correctAnswerLabel: 'Doğru cevap',
      }),
    );
    expect(xml).toHaveLength(3);
    expect(xml[0]).toContain('Matematik Sınavı');
    expect(xml[0]).toContain('9-A');
    expect(xml[1]).toContain('İkinin ikiye bölümü kaçtır?');
    expect(xml[2]).toContain('2.');
  });

  it('shows the answer line only on slides whose question has a correct label', async () => {
    const { xml } = await slides(
      await renderTestPptx({
        title: 'Sınav',
        questions: [
          { ...plainQuestion, correctLabel: 'B' },
          { ...plainQuestion, number: 2 },
        ],
        correctAnswerLabel: 'Doğru cevap',
      }),
    );
    expect(xml[1]).toContain('Doğru cevap: B');
    expect(xml[2]).not.toContain('Doğru cevap');
  });

  it('keeps every object inside the slide and shows a picture at its own shape', async () => {
    const { xml } = await slides(
      await renderTestPptx({
        title: 'Sınav',
        questions: [
          { number: 1, stemImage: picture(2000, 500), options: [], correctLabel: 'A' },
          {
            number: 2,
            stemImage: picture(600, 1800),
            options: [{ label: 'A', text: 'x' }],
            correctLabel: 'C',
          },
        ],
        correctAnswerLabel: 'Doğru cevap',
      }),
    );

    for (const slideXml of xml) {
      for (const box of boxes(slideXml)) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.cx).toBeLessThanOrEqual(SLIDE_WIDTH + 1);
        expect(box.y + box.cy).toBeLessThanOrEqual(SLIDE_HEIGHT + 1);
      }
    }

    const pictureBox = (slideXml: string) =>
      [
        ...slideXml.matchAll(
          /<p:pic>[\s\S]*?<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/g,
        ),
      ].map((match) => ({ cx: Number(match[3]), cy: Number(match[4]) }))[0]!;
    const wide = pictureBox(xml[1]!);
    const tall = pictureBox(xml[2]!);
    expect(wide.cx / wide.cy).toBeCloseTo(2000 / 500, 1);
    expect(tall.cx / tall.cy).toBeCloseTo(600 / 1800, 1);
  });

  it('never overlaps the picture with the answer line', async () => {
    const { xml } = await slides(
      await renderTestPptx({
        title: 'Sınav',
        questions: [{ number: 1, stemImage: picture(300, 3000), options: [], correctLabel: 'A' }],
        correctAnswerLabel: 'Doğru cevap',
      }),
    );
    const all = boxes(xml[1]!);
    const picBottom = Math.max(
      ...all.filter((box) => box.cy > 0.5 * EMU_PER_INCH).map((box) => box.y + box.cy),
    );
    const answerTop = Math.min(
      ...all.filter((box) => box.y > 4.5 * EMU_PER_INCH).map((box) => box.y),
    );
    expect(picBottom).toBeLessThanOrEqual(answerTop + 1);
  });

  it('embeds PNG and JPEG pictures as media files', async () => {
    const zip = await JSZip.loadAsync(
      await renderTestPptx({
        title: 'Sınav',
        questions: [
          { number: 1, stemImage: picture(800, 300, 'jpeg'), options: [] },
          { number: 2, stemImage: picture(800, 300, 'png'), options: [] },
        ],
        correctAnswerLabel: 'x',
      }),
    );
    const media = Object.keys(zip.files).filter((name) => name.startsWith('ppt/media/'));
    expect(media.length).toBeGreaterThanOrEqual(2);
  });
});
