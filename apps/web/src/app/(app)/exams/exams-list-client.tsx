'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { Badge } from '@/components/ui/badge';

export interface ExamRow {
  readonly id: string;
  readonly title: string;
  readonly mode: string;
  readonly status: string;
  readonly slug: string;
  readonly created_at: string;
}

export function ExamsListClient({ exams }: { readonly exams: readonly ExamRow[] }) {
  const t = useTranslations('exams.list');

  const columns: DataTableColumn<ExamRow>[] = [
    {
      key: 'title',
      header: t('columns.title'),
      render: (row) => (
        <Link href={`/exams/${row.id}`} className="font-medium text-ink hover:text-accent">
          {row.title}
        </Link>
      ),
    },
    { key: 'mode', header: t('columns.mode'), render: (row) => t(`mode.${row.mode}`) },
    {
      key: 'status',
      header: t('columns.status'),
      render: (row) => (
        <Badge tone={row.status === 'open' ? 'ok' : row.status === 'closed' ? 'neutral' : 'warn'}>
          {t(`status.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: 'created',
      header: t('columns.createdAt'),
      sortable: true,
      sortValue: (row) => row.created_at,
      render: (row) => new Date(row.created_at).toLocaleDateString('tr-TR'),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={exams}
      getRowId={(row) => row.id}
      emptyMessage={t('empty')}
    />
  );
}
