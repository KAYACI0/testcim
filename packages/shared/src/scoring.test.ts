import { describe, expect, it } from 'vitest';

import { scoreAnswer, totalScore } from './scoring';

import type { AnswerKey } from './schemas';

describe('scoreAnswer', () => {
  it('scores mcq by exact option id', () => {
    const key: AnswerKey = { question_type: 'mcq', option_id: 'b' };
    expect(scoreAnswer(key, { option_id: 'b' })).toBe(true);
    expect(scoreAnswer(key, { option_id: 'a' })).toBe(false);
  });

  it('scores tf by boolean value', () => {
    const key: AnswerKey = { question_type: 'tf', value: true };
    expect(scoreAnswer(key, { value: true })).toBe(true);
    expect(scoreAnswer(key, { value: false })).toBe(false);
  });

  it('scores fill case/accent-insensitively per blank, in order', () => {
    const key: AnswerKey = { question_type: 'fill', values: ['İstanbul', 'Ankara'] };
    expect(scoreAnswer(key, { values: ['istanbul', ' ANKARA '] })).toBe(true);
    expect(scoreAnswer(key, { values: ['Ankara', 'İstanbul'] })).toBe(false);
    expect(scoreAnswer(key, { values: ['İstanbul'] })).toBe(false);
  });

  it('scores match only when every pair matches, order-independent', () => {
    const key: AnswerKey = {
      question_type: 'match',
      pairs: [
        { left: '1', right: 'a' },
        { left: '2', right: 'b' },
      ],
    };
    expect(
      scoreAnswer(key, {
        pairs: [
          { left: '2', right: 'b' },
          { left: '1', right: 'a' },
        ],
      }),
    ).toBe(true);
    expect(scoreAnswer(key, { pairs: [{ left: '1', right: 'b' }] })).toBe(false);
  });

  it('returns null for open (manually graded)', () => {
    const key: AnswerKey = { question_type: 'open' };
    expect(scoreAnswer(key, { text: 'anything' })).toBeNull();
  });

  it('scores numeric within tolerance', () => {
    const key: AnswerKey = { question_type: 'numeric', value: 10, tolerance: 0.5 };
    expect(scoreAnswer(key, { value: 10.4 })).toBe(true);
    expect(scoreAnswer(key, { value: 10.6 })).toBe(false);
  });

  it('scores order by exact sequence', () => {
    const key: AnswerKey = { question_type: 'order', sequence: ['a', 'b', 'c'] };
    expect(scoreAnswer(key, { sequence: ['a', 'b', 'c'] })).toBe(true);
    expect(scoreAnswer(key, { sequence: ['b', 'a', 'c'] })).toBe(false);
  });

  it('treats missing/malformed given answers as incorrect, not a throw', () => {
    const key: AnswerKey = { question_type: 'mcq', option_id: 'a' };
    expect(scoreAnswer(key, null)).toBe(false);
    expect(scoreAnswer(key, undefined)).toBe(false);
  });
});

describe('totalScore', () => {
  it('sums points and max points across items', () => {
    expect(
      totalScore([
        { points: 1, maxPoints: 1 },
        { points: 0, maxPoints: 2 },
        { points: 3, maxPoints: 3 },
      ]),
    ).toEqual({ score: 4, maxScore: 6 });
  });
});
