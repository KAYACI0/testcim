import { getTranslations } from 'next-intl/server';

import { CreateWorkspaceForm } from './create-workspace-form';
import { WorkspaceSettingsForm } from './workspace-settings-form';

import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

export default async function WorkspaceSettingsPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data: full } = await supabase
    .from('workspaces')
    .select('branding')
    .eq('id', workspace.id)
    .single();

  const t = await getTranslations('settings.workspace');
  const canEdit = workspace.role === 'owner' || workspace.role === 'admin';

  return (
    <div className="flex max-w-sm flex-col gap-10">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
        <WorkspaceSettingsForm
          workspaceId={workspace.id}
          defaultName={workspace.name}
          defaultSchoolName={(full?.branding as { schoolName?: string } | null)?.schoolName ?? ''}
          canEdit={canEdit}
        />
      </div>

      {workspace.role === 'owner' && (
        <div className="border-t border-line pt-6">
          <h2 className="text-lg font-semibold text-ink">{t('createTeamTitle')}</h2>
          <p className="mt-1 text-sm text-ink-2">{t('createTeamDescription')}</p>
          <CreateWorkspaceForm />
        </div>
      )}
    </div>
  );
}
