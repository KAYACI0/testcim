import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { TestsListClient } from './tests-list-client';

import { PageHeader } from '@/components/patterns/page-header';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

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
        <TestsListClient tests={tests ?? []} />
      </div>
    </div>
  );
}
