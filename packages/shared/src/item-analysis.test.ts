import { describe, expect, it } from 'vitest';

import {
  difficultyP,
  discriminationIndex,
  kr20,
  mean,
  optionDistribution,
  standardDeviation,
} from './item-analysis';

describe('difficultyP', () => {
  it('is the mean correctness across attempts', () => {
    const scores = [
      { attemptId: 'a', correctness: 1 },
      { attemptId: 'b', correctness: 0 },
      { attemptId: 'c', correctness: 1 },
      { attemptId: 'd', correctness: 1 },
    ];
    expect(difficultyP(scores)).toBe(0.75);
  });

  it('is null for an empty item', () => {
    expect(difficultyP([])).toBeNull();
  });
});

describe('discriminationIndex', () => {
  it('is positive when top scorers answer the item right more often than bottom scorers', () => {
    const attempts = Array.from({ length: 10 }, (_, i) => ({
      attemptId: `a${i}`,
      correctness: i >= 5 ? 1 : 0,
    }));
    const totals = new Map(attempts.map((a, i) => [a.attemptId, i]));
    expect(discriminationIndex(attempts, totals)).toBeGreaterThan(0);
  });

  it('is zero when every attempt answers the same way', () => {
    const attempts = Array.from({ length: 10 }, (_, i) => ({ attemptId: `a${i}`, correctness: 1 }));
    const totals = new Map(attempts.map((a, i) => [a.attemptId, i]));
    expect(discriminationIndex(attempts, totals)).toBe(0);
  });

  it('is null with too few attempts to form top/bottom 27% groups', () => {
    const attempts = [
      { attemptId: 'a', correctness: 1 },
      { attemptId: 'b', correctness: 0 },
    ];
    expect(discriminationIndex(attempts, new Map())).toBeNull();
  });
});

describe('optionDistribution', () => {
  it('reports the share of respondents choosing each option, including blanks', () => {
    const dist = optionDistribution(['a', 'a', 'b', null]);
    expect(dist.get('a')).toBe(0.5);
    expect(dist.get('b')).toBe(0.25);
    expect(dist.get('__blank__')).toBe(0.25);
  });
});

describe('kr20', () => {
  it('is null for fewer than 2 items', () => {
    expect(kr20([[1, 0, 1]])).toBeNull();
  });

  it('is high when items are highly consistent with each other', () => {
    const item = [1, 0, 1, 0, 1, 0, 1, 0];
    const value = kr20([item, item, item]);
    expect(value).not.toBeNull();
    expect(value!).toBeGreaterThan(0.9);
  });

  it('is null when every attempt scores identically (zero variance)', () => {
    expect(
      kr20([
        [1, 1, 1],
        [1, 1, 1],
      ]),
    ).toBeNull();
  });
});

describe('mean/standardDeviation', () => {
  it('computes mean and population standard deviation', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 0);
  });
});
