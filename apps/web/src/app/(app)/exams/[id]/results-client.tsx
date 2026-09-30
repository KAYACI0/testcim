'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { ExamResultRow, ItemAnalysisRow } from '@/features/online-exam/actions.server';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { PageHeader } from '@/components/patterns/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { closeExamNow } from '@/features/online-exam/actions.server';

export interface ResultsData {
  readonly results: readonly ExamResultRow[];
  readonly itemAnalysis: readonly ItemAnalysisRow[];
  readonly summary: {
    readonly mean: number | null;
    readonly standardDeviation: number | null;
    readonly kr20: number | null;
    readonly participantCount: number;
  };
}

export function ResultsClient({
  examId,
  title,
  data,
}: {
  readonly examId: string;
  readonly title: string;
  readonly data: ResultsData;
}) {
  const t = useTranslations('exams.results');
  const [closing, setClosing] = useState(false);

  async function handleClose() {
    setClosing(true);
    await closeExamNow(examId);
    setClosing(false);
    window.location.reload();
  }

  const columns: DataTableColumn<ExamResultRow>[] = [
    { key: 'name', header: t('columns.name'), render: (row) => row.displayName ?? '—' },
    { key: 'studentNo', header: t('columns.studentNo'), render: (row) => row.studentNo ?? '—' },
    {
      key: 'status',
      header: t('columns.status'),
      render: (row) => (
        <Badge tone={row.status === 'submitted' ? 'ok' : 'warn'}>{t(`status.${row.status}`)}</Badge>
      ),
    },
    {
      key: 'score',
      header: t('columns.score'),
      sortable: true,
      sortValue: (row) => row.score ?? -1,
      render: (row) => (row.score !== null ? `${row.score} / ${row.maxScore}` : '—'),
    },
    { key: 'correct', header: t('columns.correct'), render: (row) => row.correctCount },
    { key: 'incorrect', header: t('columns.incorrect'), render: (row) => row.incorrectCount },
    { key: 'blank', header: t('columns.blank'), render: (row) => row.blankCount },
    {
      key: 'duration',
      header: t('columns.duration'),
      render: (row) => (row.durationSec !== null ? `${Math.round(row.durationSec / 60)} dk` : '—'),
    },
    {
      key: 'flags',
      header: t('columns.flags'),
      render: (row) => {
        const tabSwitches = (row.flags as { tabSwitchCount?: number }).tabSwitchCount;
        return tabSwitches ? t('tabSwitchCount', { count: tabSwitches }) : '—';
      },
    },
  ];

  const analysisRows = data.itemAnalysis.map((row, index) => ({ ...row, order: index + 1 }));
  const analysisColumns: DataTableColumn<(typeof analysisRows)[number]>[] = [
    { key: 'item', header: t('analysis.columns.item'), render: (row) => row.order },
    {
      key: 'difficulty',
      header: t('analysis.columns.difficulty'),
      render: (row) => (row.difficulty !== null ? row.difficulty.toFixed(2) : '—'),
    },
    {
      key: 'discrimination',
      header: t('analysis.columns.discrimination'),
      render: (row) => (row.discrimination !== null ? row.discrimination.toFixed(2) : '—'),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={title}
        action={
          <div className="flex gap-2">
            <a href={`/api/exams/${examId}/export.csv`} className="inline-block">
              <Button variant="secondary" size="sm">
                {t('exportCsv')}
              </Button>
            </a>
            <a href={`/api/exams/${examId}/export.xlsx`} className="inline-block">
              <Button variant="secondary" size="sm">
                {t('exportExcel')}
              </Button>
            </a>
            <Button size="sm" disabled={closing} onClick={() => void handleClose()}>
              {t('closeNow')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-6 border-b border-line px-6 py-4 text-sm text-ink-2">
        <span>{t('summary.participants', { count: data.summary.participantCount })}</span>
        <span>{t('summary.mean', { value: data.summary.mean?.toFixed(2) ?? '—' })}</span>
        <span>
          {t('summary.stdDev', { value: data.summary.standardDeviation?.toFixed(2) ?? '—' })}
        </span>
        <span>{t('summary.kr20', { value: data.summary.kr20?.toFixed(2) ?? '—' })}</span>
      </div>

      <div className="p-4">
        <DataTable
          columns={columns}
          rows={data.results}
          getRowId={(row) => row.attemptId}
          emptyMessage={t('empty')}
        />
      </div>

      <PageHeader title={t('analysis.title')} />
      <div className="p-4">
        <DataTable
          columns={analysisColumns}
          rows={analysisRows}
          getRowId={(row) => row.itemId}
          emptyMessage={t('analysis.empty')}
        />
      </div>
    </div>
  );
}
