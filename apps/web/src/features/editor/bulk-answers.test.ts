import { describe, expect, it } from 'vitest';

import { parseBulkAnswers } from './bulk-answers';

describe('parseBulkAnswers', () => {
  it('parses a bare letter run', () => {
    expect(parseBulkAnswers('ABCDDCBA')).toEqual([
      { index: 1, letter: 'A' },
      { index: 2, letter: 'B' },
      { index: 3, letter: 'C' },
      { index: 4, letter: 'D' },
      { index: 5, letter: 'D' },
      { index: 6, letter: 'C' },
      { index: 7, letter: 'B' },
      { index: 8, letter: 'A' },
    ]);
  });

  it('is case-insensitive for a bare letter run', () => {
    expect(parseBulkAnswers('abcd')).toEqual([
      { index: 1, letter: 'A' },
      { index: 2, letter: 'B' },
      { index: 3, letter: 'C' },
      { index: 4, letter: 'D' },
    ]);
  });

  it('parses numbered pairs separated by a dash', () => {
    expect(parseBulkAnswers('1-A 2-C 3-B')).toEqual([
      { index: 1, letter: 'A' },
      { index: 2, letter: 'C' },
      { index: 3, letter: 'B' },
    ]);
  });

  it('parses numbered pairs with mixed separators', () => {
    expect(parseBulkAnswers('1) A, 2.B 3:C')).toEqual([
      { index: 1, letter: 'A' },
      { index: 2, letter: 'B' },
      { index: 3, letter: 'C' },
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(parseBulkAnswers('   ')).toEqual([]);
  });

  it('rejects a bare-letter run containing invalid characters', () => {
    expect(parseBulkAnswers('ABXZ')).toEqual([]);
  });
});
