import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { PageHeader } from '@/components/patterns/page-header';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

interface ExamRow {
  readonly id: string;
  readonly title: string;
  readonly mode: string;
  readonly status: string;
  readonly slug: string;
  readonly created_at: string;
}

export default async function ExamsListPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data: exams } = await supabase
    .from('online_exams')
    .select('id, title, mode, status, slug, created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  const t = await getTranslations('exams.list');

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
    <div className="flex h-full flex-col">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="p-4">
        <DataTable
          columns={columns}
          rows={exams ?? []}
          getRowId={(row) => row.id}
          emptyMessage={t('empty')}
        />
      </div>
    </div>
  );
}
