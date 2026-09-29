'use server';

import { requireSession } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspace } from '@/lib/workspace/current';

/**
 * Records a KVKK deletion/export request as a `jobs` row for staff to act
 * on. `jobs` has no client-facing RLS policy (service role only), so this
 * goes through the admin client after confirming the caller has a session.
 * Actually performing the deletion/export is a later slice's work.
 */
async function queueKvkkJob(kind: 'account_deletion_request' | 'data_export_request') {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace();
  const admin = createAdminClient();

  const { error } = await admin.from('jobs').insert({
    kind,
    payload: { user_id: session.userId, workspace_id: workspace.id },
    status: 'pending',
  });

  if (error) {
    throw error;
  }
}

export async function requestAccountDeletion(): Promise<void> {
  await queueKvkkJob('account_deletion_request');
}

export async function requestDataExport(): Promise<void> {
  await queueKvkkJob('data_export_request');
}
