import { describe, expect, it } from 'vitest';

import { parseMentionedUserIds } from './mentions';

const members = [
  { id: 'u1', fullName: 'Ada Lovelace' },
  { id: 'u2', fullName: 'Grace Hopper' },
];

describe('parseMentionedUserIds', () => {
  it('matches a full-name mention case-insensitively', () => {
    expect(parseMentionedUserIds('bunu kontrol et @ada lovelace', members)).toEqual(['u1']);
  });

  it('matches multiple distinct mentions', () => {
    expect(
      new Set(parseMentionedUserIds('@Ada Lovelace ve @Grace Hopper bakabilir mi?', members)),
    ).toEqual(new Set(['u1', 'u2']));
  });

  it('does not match a name without the @ prefix', () => {
    expect(parseMentionedUserIds('Ada Lovelace bunu yazdı', members)).toEqual([]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(parseMentionedUserIds('herhangi bir not', members)).toEqual([]);
  });

  it('skips a member with an empty full name', () => {
    expect(parseMentionedUserIds('@  merhaba', [{ id: 'u3', fullName: '  ' }])).toEqual([]);
  });
});
