import { describe, expect, it } from 'vitest';

import { buildReportCardScoreRows } from './build-scores';

describe('buildReportCardScoreRows', () => {
  it('merges exam-attempt and OMR-scan rows sorted by date', () => {
    const rows = buildReportCardScoreRows(
      [{ examTitle: 'Online Quiz', score: 8, maxScore: 10, submittedAt: '2026-09-15T10:00:00Z' }],
      [{ testTitle: 'Optik Sinav', score: 72, createdAt: '2026-09-01T10:00:00Z' }],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.label).toBe('Optik Sinav');
    expect(rows[1]?.label).toBe('Online Quiz');
  });

  it('treats an OMR scan score as a 0-100 percentage', () => {
    const rows = buildReportCardScoreRows(
      [],
      [{ testTitle: 'Optik', score: 55, createdAt: '2026-09-01T10:00:00Z' }],
    );
    expect(rows[0]?.maxScore).toBe(100);
  });

  it('formats a missing or invalid date as an empty string without throwing', () => {
    const rows = buildReportCardScoreRows(
      [{ examTitle: 'Quiz', score: 5, maxScore: 10, submittedAt: null }],
      [],
    );
    expect(rows[0]?.date).toBe('');
  });

  it('returns an empty list when there are no scores', () => {
    expect(buildReportCardScoreRows([], [])).toEqual([]);
  });
});
