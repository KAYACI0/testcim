import { getTranslations } from 'next-intl/server';

import { BankClient } from './bank-client';

import { PageHeader } from '@/components/patterns/page-header';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

export default async function BankPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const t = await getTranslations('bank');

  const [foldersRes, tagsRes, subjectsRes, topicsRes, outcomesRes, testsRes] = await Promise.all([
    supabase
      .from('folders')
      .select('id, parent_id, name')
      .eq('workspace_id', workspace.id)
      .eq('kind', 'questions')
      .order('name'),
    supabase.from('tags').select('id, name').eq('workspace_id', workspace.id).order('name'),
    supabase
      .from('curriculum_subjects')
      .select('id, code, name, grade_from, grade_to')
      .order('name'),
    supabase.from('curriculum_topics').select('id, subject_id, name').order('name'),
    supabase
      .from('curriculum_outcomes')
      .select('id, subject_id, topic_id, grade, code, description')
      .order('code'),
    supabase
      .from('tests')
      .select('id, title')
      .eq('workspace_id', workspace.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('title')} description={t('description')} />
      <BankClient
        folders={foldersRes.data ?? []}
        tags={tagsRes.data ?? []}
        subjects={subjectsRes.data ?? []}
        topics={topicsRes.data ?? []}
        outcomes={outcomesRes.data ?? []}
        tests={testsRes.data ?? []}
      />
    </div>
  );
}
