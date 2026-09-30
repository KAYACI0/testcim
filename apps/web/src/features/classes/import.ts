import { rosterImportRowSchema, type RosterImportRow } from '@testcim/shared';

/** One row of a parsed spreadsheet, before column mapping is applied. */
export interface RawRosterRow {
  readonly rowIndex: number;
  readonly values: Readonly<Record<string, string>>;
}

export interface RosterColumnMapping {
  readonly studentNoColumn?: string;
  readonly fullNameColumn: string;
}

export interface RosterRowError {
  readonly rowIndex: number;
  readonly reason: 'full_name_required' | 'duplicate_student_no';
}

export interface RosterMappingResult {
  readonly valid: readonly RosterImportRow[];
  readonly errors: readonly RosterRowError[];
}

/**
 * Applies a column mapping to raw spreadsheet rows and validates each one.
 * Never surfaces fields beyond `studentNo`/`fullName` — the KVKK rule that
 * student data stays minimal is enforced here, not just in the UI, since
 * this is the single chokepoint every import row passes through before
 * reaching `bulk_import_students`.
 */
export function mapRosterRows(
  rows: readonly RawRosterRow[],
  mapping: RosterColumnMapping,
): RosterMappingResult {
  const valid: RosterImportRow[] = [];
  const errors: RosterRowError[] = [];
  const seenStudentNos = new Set<string>();

  for (const row of rows) {
    const fullName = row.values[mapping.fullNameColumn]?.trim() ?? '';
    const studentNoRaw = mapping.studentNoColumn
      ? row.values[mapping.studentNoColumn]?.trim()
      : undefined;
    const studentNo = studentNoRaw && studentNoRaw.length > 0 ? studentNoRaw : undefined;

    if (studentNo && seenStudentNos.has(studentNo)) {
      errors.push({ rowIndex: row.rowIndex, reason: 'duplicate_student_no' });
      continue;
    }

    const parsed = rosterImportRowSchema.safeParse({ studentNo, fullName });
    if (!parsed.success) {
      errors.push({ rowIndex: row.rowIndex, reason: 'full_name_required' });
      continue;
    }

    if (studentNo) seenStudentNos.add(studentNo);
    valid.push(parsed.data);
  }

  return { valid, errors };
}

/** `classes.school_year` is a free-text `"YYYY-YYYY"` range; retention defaults to one year past its end. */
export function computeDefaultRetentionUntil(schoolYear: string | null): string | null {
  if (!schoolYear) return null;
  const match = /^(\d{4})-(\d{4})$/.exec(schoolYear.trim());
  if (!match) return null;
  const endYear = Number(match[2]);
  return `${endYear + 1}-06-30`;
}
