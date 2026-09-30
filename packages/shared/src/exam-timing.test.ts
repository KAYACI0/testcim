import { describe, expect, it } from 'vitest';

import { computeDeadline, isPastDeadline, isWithinExamWindow } from './exam-timing';

describe('computeDeadline', () => {
  it('uses now + duration when there is no closesAt', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    const deadline = computeDeadline({ now, durationSec: 600, closesAt: null });
    expect(deadline?.toISOString()).toBe('2026-01-01T10:10:00.000Z');
  });

  it('is capped by closesAt even if duration would run past it', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    const closesAt = new Date('2026-01-01T10:05:00Z');
    const deadline = computeDeadline({ now, durationSec: 3600, closesAt });
    expect(deadline?.toISOString()).toBe(closesAt.toISOString());
  });

  it('falls back to closesAt when there is no duration cap', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    const closesAt = new Date('2026-01-01T12:00:00Z');
    expect(computeDeadline({ now, durationSec: null, closesAt })?.toISOString()).toBe(
      closesAt.toISOString(),
    );
  });

  it('is null when neither duration nor closesAt is set', () => {
    expect(computeDeadline({ now: new Date(), durationSec: null, closesAt: null })).toBeNull();
  });
});

describe('isPastDeadline', () => {
  it('is false when there is no deadline', () => {
    expect(isPastDeadline(null, new Date())).toBe(false);
  });

  it('compares against the given clock, not the real one', () => {
    const deadline = new Date('2026-01-01T10:00:00Z');
    expect(isPastDeadline(deadline, new Date('2026-01-01T09:59:59Z'))).toBe(false);
    expect(isPastDeadline(deadline, new Date('2026-01-01T10:00:01Z'))).toBe(true);
  });
});

describe('isWithinExamWindow', () => {
  const opensAt = new Date('2026-01-01T10:00:00Z');
  const closesAt = new Date('2026-01-01T12:00:00Z');

  it('is true inside the window', () => {
    expect(isWithinExamWindow({ now: new Date('2026-01-01T11:00:00Z'), opensAt, closesAt })).toBe(
      true,
    );
  });

  it('is false before opening or after closing', () => {
    expect(isWithinExamWindow({ now: new Date('2026-01-01T09:00:00Z'), opensAt, closesAt })).toBe(
      false,
    );
    expect(isWithinExamWindow({ now: new Date('2026-01-01T13:00:00Z'), opensAt, closesAt })).toBe(
      false,
    );
  });

  it('is true when the exam has no window at all', () => {
    expect(isWithinExamWindow({ now: new Date(), opensAt: null, closesAt: null })).toBe(true);
  });
});
