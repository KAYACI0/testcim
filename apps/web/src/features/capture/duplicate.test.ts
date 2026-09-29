import { describe, expect, it } from 'vitest';

import { findDuplicate, type DuplicateCandidate } from './duplicate';

describe('findDuplicate', () => {
  const candidates: DuplicateCandidate[] = [
    { id: 'a', sha256: 'hash-a', phash: '0000000000000000' },
    { id: 'b', sha256: 'hash-b', phash: 'ffffffffffffffff' },
  ];

  it('finds an exact SHA-256 match', () => {
    expect(findDuplicate(candidates, 'hash-b', '1111111111111111')).toBe('b');
  });

  it('finds a near-duplicate by perceptual hash within the threshold', () => {
    // '0000000000000001' differs from '0000000000000000' by 1 bit.
    expect(findDuplicate(candidates, 'hash-new', '0000000000000001', 6)).toBe('a');
  });

  it('returns null when nothing is close enough', () => {
    expect(findDuplicate(candidates, 'hash-new', '0f0f0f0f0f0f0f0f', 2)).toBeNull();
  });

  it('returns null against an empty candidate list', () => {
    expect(findDuplicate([], 'hash-x', '0000000000000000')).toBeNull();
  });

  it('ignores candidates with no hashes recorded yet', () => {
    const pending: DuplicateCandidate[] = [{ id: 'c', sha256: null, phash: null }];
    expect(findDuplicate(pending, 'hash-x', '0000000000000000')).toBeNull();
  });
});
