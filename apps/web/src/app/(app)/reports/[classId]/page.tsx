import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import type { ClassReport, WeakTopicRow } from '@testcim/shared';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { PageHeader } from '@/components/patterns/page-header';
import { getClassRoster } from '@/features/classes/actions.server';
import { getClassReport, getWeakTopics } from '@/features/reports/actions.server';

export default async function ClassReportPage({
  params,
}: {
  readonly params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const roster = await getClassRoster(classId);
  if (!roster) notFound();

  const [report, weakTopics, t] = await Promise.all([
    getClassReport(classId),
    getWeakTopics(classId),
    getTranslations('reports.class'),
  ]);

  const studentNameById = new Map(roster.students.map((s) => [s.id, s.full_name]));

  const hardestColumns: DataTableColumn<ClassReport['hardest_questions'][number]>[] = [
    {
      key: 'stem',
      header: t('columns.question'),
      render: (row) => row.stem_preview || t('untitledQuestion'),
    },
    {
      key: 'rate',
      header: t('columns.correctRate'),
      render: (row) => `%${row.correct_rate_percent}`,
    },
  ];

  const topicColumns: DataTableColumn<WeakTopicRow>[] = [
    { key: 'name', header: t('columns.topic'), render: (row) => row.name },
    {
      key: 'rate',
      header: t('columns.correctRate'),
      render: (row) => `%${row.correct_rate_percent} (${row.correct_count}/${row.total_count})`,
    },
  ];

  const distributionColumns: DataTableColumn<ClassReport['score_distribution'][number]>[] = [
    {
      key: 'student',
      header: t('columns.student'),
      render: (row) => (
        <Link
          href={`/reports/${classId}/students/${row.student_id}`}
          className="text-ink hover:text-accent"
        >
          {studentNameById.get(row.student_id) ?? row.student_id}
        </Link>
      ),
    },
    { key: 'percent', header: t('columns.percent'), render: (row) => `%${row.percent}` },
  ];

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={roster.className} description={t('description')} />
      <div className="flex flex-col gap-8 p-4">
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-ink-2">{t('averagePercentLabel')}</p>
            <p className="text-2xl font-semibold text-ink">
              {report.average_percent === null ? '—' : `%${report.average_percent}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-2">{t('attemptCountLabel')}</p>
            <p className="text-2xl font-semibold text-ink">{report.attempt_count}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">{t('distributionTitle')}</h2>
          <DataTable
            columns={distributionColumns}
            rows={report.score_distribution}
            getRowId={(row) => row.student_id}
            emptyMessage={t('empty')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">{t('hardestQuestionsTitle')}</h2>
          <DataTable
            columns={hardestColumns}
            rows={report.hardest_questions}
            getRowId={(row) => row.item_id}
            emptyMessage={t('empty')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-ink">{t('weakTopicsTitle')}</h2>
          <DataTable
            columns={topicColumns}
            rows={weakTopics}
            getRowId={(row) => row.topic_id}
            emptyMessage={t('empty')}
          />
        </div>
      </div>
    </div>
  );
}
