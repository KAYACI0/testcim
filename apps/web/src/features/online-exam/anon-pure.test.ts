import { describe, expect, it } from 'vitest';

import {
  attemptIsWritable,
  examCookieName,
  generateToken,
  hashIdentifier,
  hashToken,
} from './anon-pure';

describe('examCookieName', () => {
  it('scopes the cookie name to the exam slug', () => {
    expect(examCookieName('abc123')).toBe('exam_tok_abc123');
    expect(examCookieName('abc123')).not.toBe(examCookieName('xyz789'));
  });
});

describe('generateToken/hashToken', () => {
  it('generates a token that is not itself the hash stored in the DB', () => {
    const token = generateToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hashToken(token)).not.toBe(token);
  });

  it('hashes deterministically so a re-presented cookie still matches', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('produces different hashes for different tokens', () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
  });
});

describe('hashIdentifier', () => {
  it('never returns the raw input', () => {
    expect(hashIdentifier('12345')).not.toBe('12345');
  });

  it('is deterministic for max_attempts dedup lookups', () => {
    expect(hashIdentifier('Ayşe Yılmaz')).toBe(hashIdentifier('Ayşe Yılmaz'));
  });
});

describe('attemptIsWritable', () => {
  const base = {
    id: 'a',
    workspaceId: 'w',
    onlineExamId: 'e',
    deadlineAt: null as string | null,
    status: 'in_progress' as const,
  };

  it('is false once submitted or expired, regardless of deadline', () => {
    expect(attemptIsWritable({ ...base, status: 'submitted' })).toBe(false);
    expect(attemptIsWritable({ ...base, status: 'expired' })).toBe(false);
  });

  it('is true in_progress with no deadline', () => {
    expect(attemptIsWritable(base)).toBe(true);
  });

  it('is false in_progress but past its own deadline', () => {
    expect(
      attemptIsWritable({ ...base, deadlineAt: new Date(Date.now() - 1000).toISOString() }),
    ).toBe(false);
  });

  it('is true in_progress and before its deadline', () => {
    expect(
      attemptIsWritable({ ...base, deadlineAt: new Date(Date.now() + 60_000).toISOString() }),
    ).toBe(true);
  });
});
