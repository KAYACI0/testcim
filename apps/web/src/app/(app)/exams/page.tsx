import { getTranslations } from 'next-intl/server';

import { ExamsListClient } from './exams-list-client';

import { PageHeader } from '@/components/patterns/page-header';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

export default async function ExamsListPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data: exams } = await supabase
    .from('online_exams')
    .select('id, title, mode, status, slug, created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  const t = await getTranslations('exams.list');

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="p-4">
        <ExamsListClient exams={exams ?? []} />
      </div>
    </div>
  );
}
