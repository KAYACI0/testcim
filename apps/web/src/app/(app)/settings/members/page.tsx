import { getTranslations } from 'next-intl/server';

import { InviteForm } from './invite-form';
import { MembersTable } from './members-table';

import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

export default async function MembersSettingsPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const canManage = workspace.role === 'owner' || workspace.role === 'admin';

  const [{ data: memberRows }, { data: invites }] = await Promise.all([
    supabase.from('workspace_members').select('user_id, role').eq('workspace_id', workspace.id),
    canManage
      ? supabase
          .from('workspace_invites')
          .select('id, email, role, expires_at, accepted_at')
          .eq('workspace_id', workspace.id)
          .is('accepted_at', null)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  // Two plain selects merged here rather than an embedded `profiles(...)`
  // join — see the note in lib/supabase/types.ts on why joins are avoided.
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in(
      'id',
      (memberRows ?? []).map((row) => row.user_id),
    );
  const fullNameByUserId = new Map((profileRows ?? []).map((row) => [row.id, row.full_name]));

  const t = await getTranslations('settings.members');

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
        <MembersTable
          workspaceId={workspace.id}
          members={(memberRows ?? []).map((row) => ({
            userId: row.user_id,
            role: row.role,
            fullName: fullNameByUserId.get(row.user_id) ?? null,
          }))}
          canManage={canManage}
        />
      </div>

      {canManage && (
        <div className="border-t border-line pt-6">
          <h2 className="text-lg font-semibold text-ink">{t('inviteTitle')}</h2>
          <InviteForm workspaceId={workspace.id} />

          {invites && invites.length > 0 && (
            <p className="mt-4 text-sm text-ink-2">
              {t('pendingInvites', { count: invites.length })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
