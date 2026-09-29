import { describe, expect, it } from 'vitest';

import { parseAnswerKeyTable } from './answer-key-parse';

import type { PdfTextItem } from './pdf-text';

function item(str: string): PdfTextItem {
  return { str, x: 0, yTop: 0, width: str.length * 5, height: 10 };
}

describe('parseAnswerKeyTable', () => {
  it('parses a flat "N-L" list', () => {
    const entries = parseAnswerKeyTable([item('1-A 2-C 3-B 4-D 5-E')]);

    expect(entries).toEqual([
      { number: 1, letter: 'A' },
      { number: 2, letter: 'C' },
      { number: 3, letter: 'B' },
      { number: 4, letter: 'D' },
      { number: 5, letter: 'E' },
    ]);
  });

  it('parses a "N.L" and "N)L" mix across separate items (table cells)', () => {
    const entries = parseAnswerKeyTable([item('1.A'), item('2)B'), item('3 - C')]);

    expect(entries).toEqual([
      { number: 1, letter: 'A' },
      { number: 2, letter: 'B' },
      { number: 3, letter: 'C' },
    ]);
  });

  it('drops a number seen with two different letters instead of guessing', () => {
    const entries = parseAnswerKeyTable([item('1-A'), item('1-B'), item('2-C')]);

    expect(entries).toEqual([{ number: 2, letter: 'C' }]);
  });

  it('keeps a number repeated with the same letter', () => {
    const entries = parseAnswerKeyTable([item('1-A'), item('1-A'), item('2-C')]);

    expect(entries).toEqual([
      { number: 1, letter: 'A' },
      { number: 2, letter: 'C' },
    ]);
  });

  it('returns nothing when there is no answer-key-shaped text', () => {
    expect(parseAnswerKeyTable([item('Bir soru metni burada yer alir')])).toEqual([]);
  });
});
