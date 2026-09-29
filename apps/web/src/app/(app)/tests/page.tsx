import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { PageHeader } from '@/components/patterns/page-header';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

interface TestRow {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly question_count: number;
  readonly updated_at: string;
}

export default async function TestsListPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data: tests } = await supabase
    .from('tests')
    .select('id, title, type, question_count, updated_at')
    .eq('workspace_id', workspace.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  const t = await getTranslations('tests.list');

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
    <div>
      <PageHeader
        title={t('title')}
        action={
          <Button asChild>
            <Link href="/tests/new">{t('newTestAction')}</Link>
          </Button>
        }
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          rows={tests ?? []}
          getRowId={(row) => row.id}
          emptyMessage={t('empty')}
        />
      </div>
    </div>
  );
}
