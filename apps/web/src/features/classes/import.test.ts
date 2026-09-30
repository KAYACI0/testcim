import { describe, expect, it } from 'vitest';

import { computeDefaultRetentionUntil, mapRosterRows } from './import';

describe('mapRosterRows', () => {
  const mapping = { studentNoColumn: 'No', fullNameColumn: 'Ad Soyad' };

  it('maps valid rows through the column mapping', () => {
    const result = mapRosterRows(
      [
        { rowIndex: 0, values: { No: '101', 'Ad Soyad': 'Ada Lovelace' } },
        { rowIndex: 1, values: { No: '102', 'Ad Soyad': 'Grace Hopper' } },
      ],
      mapping,
    );

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toEqual([
      { studentNo: '101', fullName: 'Ada Lovelace' },
      { studentNo: '102', fullName: 'Grace Hopper' },
    ]);
  });

  it('allows a missing student number', () => {
    const result = mapRosterRows(
      [{ rowIndex: 0, values: { No: '', 'Ad Soyad': 'Ada Lovelace' } }],
      mapping,
    );

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toEqual([{ studentNo: undefined, fullName: 'Ada Lovelace' }]);
  });

  it('flags a row with no full name', () => {
    const result = mapRosterRows(
      [{ rowIndex: 3, values: { No: '101', 'Ad Soyad': '  ' } }],
      mapping,
    );

    expect(result.valid).toHaveLength(0);
    expect(result.errors).toEqual([{ rowIndex: 3, reason: 'full_name_required' }]);
  });

  it('flags the second occurrence of a duplicate student number', () => {
    const result = mapRosterRows(
      [
        { rowIndex: 0, values: { No: '101', 'Ad Soyad': 'Ada Lovelace' } },
        { rowIndex: 1, values: { No: '101', 'Ad Soyad': 'Someone Else' } },
      ],
      mapping,
    );

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toEqual([{ rowIndex: 1, reason: 'duplicate_student_no' }]);
  });

  it('scales to 300 rows without erroring', () => {
    const rows = Array.from({ length: 300 }, (_, i) => ({
      rowIndex: i,
      values: { No: String(i + 1), 'Ad Soyad': `Öğrenci ${i + 1}` },
    }));

    const result = mapRosterRows(rows, mapping);

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(300);
  });
});

describe('computeDefaultRetentionUntil', () => {
  it('adds one year past the school year end', () => {
    expect(computeDefaultRetentionUntil('2025-2026')).toBe('2027-06-30');
  });

  it('returns null for a missing or malformed school year', () => {
    expect(computeDefaultRetentionUntil(null)).toBeNull();
    expect(computeDefaultRetentionUntil('not-a-year')).toBeNull();
  });
});
