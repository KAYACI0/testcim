import { getTranslations } from 'next-intl/server';

import { OmrClient } from './omr-client';

import { PageHeader } from '@/components/patterns/page-header';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

export default async function OmrPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data: tests } = await supabase
    .from('tests')
    .select('id, title, question_count')
    .eq('workspace_id', workspace.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  const t = await getTranslations('omr');

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('title')} description={t('description')} />
      <OmrClient tests={tests ?? []} />
    </div>
  );
}

