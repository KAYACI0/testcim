import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import type { OutcomeReportRow, StudentProgressRow } from '@testcim/shared';

import { StudentReportCardButton } from './student-report-card-button';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { PageHeader } from '@/components/patterns/page-header';
import { getClassRoster } from '@/features/classes/actions.server';
import { getOutcomeReport, getStudentProgress } from '@/features/reports/actions.server';
import { LineChart } from '@/features/reports/components/line-chart';

export default async function StudentProgressPage({
  params,
}: {
  readonly params: Promise<{ classId: string; studentId: string }>;
}) {
  const { classId, studentId } = await params;
  const roster = await getClassRoster(classId);
  if (!roster) notFound();

  const student = roster.students.find((s) => s.id === studentId);
  if (!student) notFound();

  const [progress, outcomes, t] = await Promise.all([
    getStudentProgress(studentId),
    getOutcomeReport(classId, studentId),
    getTranslations('reports.student'),
  ]);

  const progressColumns: DataTableColumn<StudentProgressRow>[] = [
    { key: 'exam', header: t('columns.exam'), render: (row) => row.exam_title },
    {
      key: 'score',
      header: t('columns.score'),
      render: (row) => `${row.score}/${row.max_score}`,
    },
    {
      key: 'date',
      header: t('columns.date'),
      render: (row) => new Date(row.submitted_at).toLocaleDateString('tr-TR'),
    },
  ];

  const outcomeColumns: DataTableColumn<OutcomeReportRow>[] = [
    { key: 'description', header: t('columns.outcome'), render: (row) => row.description },
    {
      key: 'rate',
      header: t('columns.correctRate'),
      render: (row) => `%${row.correct_rate_percent} (${row.correct_count}/${row.total_count})`,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={student.full_name}
        description={t('description')}
        action={
          <StudentReportCardButton
            studentId={studentId}
            studentName={student.full_name}
            classId={classId}
          />
        }
      />
      <div className="flex flex-col gap-8 p-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">{t('progressChartTitle')}</h2>
          <LineChart
            points={progress.map((row) => ({
              label: row.exam_title,
              value: (row.score / row.max_score) * 100,
            }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">{t('progressTableTitle')}</h2>
          <DataTable
            columns={progressColumns}
            rows={progress}
            getRowId={(row) => `${row.exam_title}-${row.submitted_at}`}
            emptyMessage={t('empty')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">{t('outcomesTableTitle')}</h2>
          <DataTable
            columns={outcomeColumns}
            rows={outcomes}
            getRowId={(row) => row.outcome_id}
            emptyMessage={t('empty')}
          />
        </div>
      </div>
    </div>
  );
}
