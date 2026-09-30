import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

import { getExamResults } from '@/features/online-exam/actions.server';

/** e-Okul not girişine uygun sade şablon (docs/prompts/09 item 9): sıra, numara, ad soyad, puan/not. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const results = await getExamResults(id);
  if (!results.ok) {
    return NextResponse.json({ ok: false, reason: results.reason }, { status: 404 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sonuçlar');
  sheet.columns = [
    { header: 'Sıra', key: 'order', width: 6 },
    { header: 'Numara', key: 'studentNo', width: 12 },
    { header: 'Ad Soyad', key: 'name', width: 28 },
    { header: 'Puan', key: 'score', width: 10 },
    { header: 'Not', key: 'grade', width: 8 },
  ];
  sheet.getRow(1).font = { bold: true };

  results.results.forEach((row, index) => {
    sheet.addRow({
      order: index + 1,
      studentNo: row.studentNo ?? '',
      name: row.displayName ?? '',
      score: row.score ?? '',
      grade: row.maxScore ? Math.round(((row.score ?? 0) / row.maxScore) * 100) : '',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="sinav-sonuclari-${id}.xlsx"`,
    },
  });
}
