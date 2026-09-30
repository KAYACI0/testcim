import type { ReportCardScoreRow } from '@testcim/renderers';

export interface RawExamAttemptScore {
  readonly examTitle: string;
  readonly score: number;
  readonly maxScore: number;
  readonly submittedAt: string | null;
}

/**
 * `omr_scans` has no `max_score` column — a scan's `score` is already
 * normalized to a 0-100 scale by the OMR scoring path. Treated as a
 * percentage here (`maxScore: 100`); revisit once PR5's report RPCs define a
 * single shared exam_attempts/omr_scans scoring model (docs/backlog.md).
 */
export interface RawOmrScanScore {
  readonly testTitle: string;
  readonly score: number;
  readonly createdAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR');
}

/** Merges exam-attempt and OMR-scan scores into one date-sorted list for the report card. */
export function buildReportCardScoreRows(
  examScores: readonly RawExamAttemptScore[],
  omrScores: readonly RawOmrScanScore[],
): ReportCardScoreRow[] {
  const rows: ReportCardScoreRow[] = [
    ...examScores.map((e) => ({
      label: e.examTitle,
      score: e.score,
      maxScore: e.maxScore,
      date: formatDate(e.submittedAt),
    })),
    ...omrScores.map((s) => ({
      label: s.testTitle,
      score: s.score,
      maxScore: 100,
      date: formatDate(s.createdAt),
    })),
  ];

  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}
