import { describe, expect, it } from 'vitest';

import { seededShuffle } from './seeded-shuffle';

describe('seededShuffle', () => {
  it('is deterministic for the same seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(seededShuffle(items, 'attempt-1')).toEqual(seededShuffle(items, 'attempt-1'));
  });

  it('differs across seeds (with overwhelming probability for 5+ items)', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(seededShuffle(items, 'attempt-1')).not.toEqual(seededShuffle(items, 'attempt-2'));
  });

  it('is a permutation: same elements, same length', () => {
    const items = [1, 2, 3, 4, 5];
    const shuffled = seededShuffle(items, 'seed');
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it('does not mutate the input array', () => {
    const items = [1, 2, 3];
    const copy = [...items];
    seededShuffle(items, 'seed');
    expect(items).toEqual(copy);
  });
});
