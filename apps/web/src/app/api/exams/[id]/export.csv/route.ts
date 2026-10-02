import { NextResponse } from 'next/server';

import { getExamResults } from '@/features/online-exam/actions.server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const results = await getExamResults(id);
  if (!results.ok) {
    return NextResponse.json({ ok: false, reason: results.reason }, { status: 404 });
  }

  const header = ['Sıra', 'Numara', 'Ad Soyad', 'Puan', 'Not'];
  const rows = results.results.map((row, index) => [
    String(index + 1),
    row.studentNo ?? '',
    row.displayName ?? '',
    row.score !== null ? String(row.score) : '',
    row.maxScore ? String(Math.round(((row.score ?? 0) / row.maxScore) * 100)) : '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');

  return new NextResponse('﻿' + csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="sinav-sonuclari-${id}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  let safe = value;
  // Neutralize formula triggers in spreadsheet software (CWE-1236)
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
