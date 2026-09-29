import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { splitTextLayer } from './pdf-split';

import type { PdfTextItem } from './pdf-text';

const PAGE_WIDTH = 400;
const PAGE_HEIGHT = 600;

function item(
  str: string,
  x: number,
  yTop: number,
  width = str.length * 5,
  height = 10,
): PdfTextItem {
  return { str, x, yTop, width, height };
}

/** One question: an isolated "N." number item plus a body item on the same line. */
function question(number: number, x: number, yTop: number, bodyWidth = 150): PdfTextItem[] {
  return [
    item(`${number}.`, x, yTop, 16),
    item('Bir soru metni burada yer alir', x + 20, yTop, bodyWidth),
  ];
}

describe('splitTextLayer', () => {
  it('returns nothing for an empty page', () => {
    expect(splitTextLayer([], PAGE_WIDTH, PAGE_HEIGHT)).toEqual([]);
  });

  it('suggests one box per question in a single column, in order', () => {
    const items = [...question(1, 40, 50), ...question(2, 40, 150), ...question(3, 40, 250)];

    const suggestions = splitTextLayer(items, PAGE_WIDTH, PAGE_HEIGHT);

    expect(suggestions.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(suggestions.every((s) => s.confidence === 1)).toBe(true);
    // Box 1 stops before box 2 starts.
    expect(suggestions[0]!.y + suggestions[0]!.height).toBeLessThanOrEqual(suggestions[1]!.y + 1);
  });

  it('assigns questions to left/right columns and reads column-major order', () => {
    const items = [
      ...question(1, 30, 50, 100),
      ...question(2, 30, 200, 100),
      ...question(3, 250, 50, 100),
      ...question(4, 250, 200, 100),
    ];

    const suggestions = splitTextLayer(items, PAGE_WIDTH, PAGE_HEIGHT);

    expect(suggestions.map((s) => s.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    const left = suggestions.filter((s) => s.x < 150);
    const right = suggestions.filter((s) => s.x >= 150);
    expect(left.map((s) => s.number)).toEqual([1, 2]);
    expect(right.map((s) => s.number)).toEqual([3, 4]);
  });

  it('does not treat a mid-sentence number as a question start', () => {
    const items = [
      ...question(1, 40, 50),
      // A line whose first token happens to look like a year, but is
      // indented well past the column's left edge.
      item('2023', 120, 90, 30),
      ...question(2, 40, 150),
    ];

    const suggestions = splitTextLayer(items, PAGE_WIDTH, PAGE_HEIGHT);

    expect(suggestions.map((s) => s.number)).toEqual([1, 2]);
  });

  it('skips a line with no leading number pattern', () => {
    const items = [
      ...question(1, 40, 50),
      item('Ortak bir paragraf metni', 40, 100, 200),
      ...question(2, 40, 150),
    ];

    const suggestions = splitTextLayer(items, PAGE_WIDTH, PAGE_HEIGHT);

    expect(suggestions.map((s) => s.number)).toEqual([1, 2]);
  });

  it('reports a lower confidence when the sequence breaks', () => {
    const items = [...question(1, 40, 50), ...question(5, 40, 150), ...question(6, 40, 250)];

    const suggestions = splitTextLayer(items, PAGE_WIDTH, PAGE_HEIGHT);

    expect(suggestions.map((s) => s.confidence)).toEqual([1, 0.5, 1]);
  });

  it('finds the number token bounding box for masking, isolated case', () => {
    const items = question(1, 40, 50);
    const [suggestion] = splitTextLayer(items, PAGE_WIDTH, PAGE_HEIGHT);

    expect(suggestion!.numberBox).toEqual({ x: 40, y: 50, width: 16, height: 10 });
  });

  it('estimates the number token box when merged into one item', () => {
    const merged = [item('12. Bir soru metni burada', 40, 50, 200)];

    const [suggestion] = splitTextLayer(merged, PAGE_WIDTH, PAGE_HEIGHT);

    expect(suggestion!.number).toBe(12);
    expect(suggestion!.numberBox.x).toBe(40);
    expect(suggestion!.numberBox.width).toBeGreaterThan(0);
    expect(suggestion!.numberBox.width).toBeLessThan(200);
  });

  it('never produces overlapping y-ranges within the same column', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: 99 }), { minLength: 1, maxLength: 12 }),
        (numbers) => {
          const sorted = [...numbers].sort((a, b) => a - b);
          const items = sorted.flatMap((n, i) => question(n, 40, 50 + i * 80));

          const suggestions = splitTextLayer(items, PAGE_WIDTH, PAGE_HEIGHT);

          expect(suggestions).toHaveLength(sorted.length);
          for (let i = 0; i < suggestions.length - 1; i += 1) {
            expect(suggestions[i]!.y).toBeLessThanOrEqual(suggestions[i + 1]!.y);
            expect(suggestions[i]!.y + suggestions[i]!.height).toBeLessThanOrEqual(
              suggestions[i + 1]!.y + 0.01,
            );
          }
        },
      ),
    );
  });
});
