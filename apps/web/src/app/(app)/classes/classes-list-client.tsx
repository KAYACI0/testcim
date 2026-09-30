'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import type { ClassRow } from '@/features/classes/actions.server';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { Badge } from '@/components/ui/badge';
import { archiveClass } from '@/features/classes/actions.server';

export function ClassesListClient({ classes }: { readonly classes: readonly ClassRow[] }) {
  const t = useTranslations('classes.list');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleArchive(classId: string) {
    startTransition(async () => {
      await archiveClass(classId);
      router.refresh();
    });
  }

  const columns: DataTableColumn<ClassRow>[] = [
    {
      key: 'name',
      header: t('columns.name'),
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link href={`/classes/${row.id}`} className="font-medium text-ink hover:text-accent">
            {row.name}
          </Link>
          {row.archived && <Badge tone="neutral">{t('archived')}</Badge>}
        </div>
      ),
    },
    {
      key: 'grade',
      header: t('columns.grade'),
      render: (row) => row.grade ?? '—',
    },
    {
      key: 'schoolYear',
      header: t('columns.schoolYear'),
      render: (row) => row.school_year ?? '—',
    },
    {
      key: 'studentCount',
      header: t('columns.studentCount'),
      sortable: true,
      sortValue: (row) => row.student_count,
      render: (row) => row.student_count,
    },
    {
      key: 'retention',
      header: t('columns.retention'),
      render: (row) =>
        row.retention_until
          ? new Date(row.retention_until).toLocaleDateString('tr-TR')
          : t('retentionIndefinite'),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.archived ? null : (
          <button
            type="button"
            className="text-sm text-ink-2 hover:text-err disabled:opacity-40"
            disabled={pending}
            onClick={() => handleArchive(row.id)}
          >
            {t('archiveAction')}
          </button>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={classes}
      getRowId={(row) => row.id}
      emptyMessage={t('empty')}
    />
  );
}
