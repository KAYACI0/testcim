import { describe, expect, it } from 'vitest';

import { resolveDuplicateLookup } from './dedupe';

describe('resolveDuplicateLookup', () => {
  it('prefers sha256 when present, regardless of stem text', () => {
    expect(resolveDuplicateLookup({ sha256: 'abc123', stemText: 'Bir soru' })).toEqual({
      kind: 'sha256',
      value: 'abc123',
    });
  });

  it('falls back to a trimmed stem_text match when there is no asset hash', () => {
    expect(resolveDuplicateLookup({ sha256: null, stemText: '  Bir soru  ' })).toEqual({
      kind: 'stem_text',
      value: 'Bir soru',
    });
  });

  it('reports no lookup possible when neither is present', () => {
    expect(resolveDuplicateLookup({ sha256: null, stemText: null })).toEqual({ kind: 'none' });
    expect(resolveDuplicateLookup({ sha256: null, stemText: '   ' })).toEqual({ kind: 'none' });
  });
});
