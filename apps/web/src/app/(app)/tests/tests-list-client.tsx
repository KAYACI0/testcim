'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';

export interface TestRow {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly question_count: number;
  readonly updated_at: string;
}

export function TestsListClient({ tests }: { readonly tests: readonly TestRow[] }) {
  const t = useTranslations('tests.list');

  const columns: DataTableColumn<TestRow>[] = [
    {
      key: 'title',
      header: t('columns.name'),
      sortable: true,
      sortValue: (row) => row.title,
      render: (row) => (
        <Link href={`/tests/${row.id}`} className="font-medium text-ink hover:text-accent">
          {row.title}
        </Link>
      ),
    },
    {
      key: 'type',
      header: t('columns.type'),
      sortable: true,
      sortValue: (row) => row.type,
      render: (row) => t(`types.${row.type}`),
    },
    {
      key: 'question_count',
      header: t('columns.questionCount'),
      sortable: true,
      sortValue: (row) => row.question_count,
      render: (row) => row.question_count,
    },
    {
      key: 'updated_at',
      header: t('columns.lastEdited'),
      sortable: true,
      sortValue: (row) => row.updated_at,
      render: (row) => new Date(row.updated_at).toLocaleDateString('tr-TR'),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={tests}
      getRowId={(row) => row.id}
      emptyMessage={t('empty')}
    />
  );
}
