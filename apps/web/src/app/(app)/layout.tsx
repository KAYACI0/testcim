import { redirect } from 'next/navigation';

import { ProtectedShell } from './protected-shell';

import type { ReactNode } from 'react';

import { WorkspaceProvider } from '@/features/workspace/workspace-context';
import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace, listMemberships } from '@/lib/workspace/current';
import { getEntitlements } from '@/lib/workspace/entitlements.server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding')
    .eq('id', session.userId)
    .single();

  if (!(profile?.onboarding as { completed?: boolean } | null)?.completed) {
    redirect('/onboarding');
  }

  const [memberships, currentWorkspace] = await Promise.all([
    listMemberships(),
    getCurrentWorkspace(),
  ]);
  const entitlements = await getEntitlements(currentWorkspace.id);

  return (
    <WorkspaceProvider entitlements={entitlements}>
      <ProtectedShell
        memberships={memberships}
        currentWorkspace={currentWorkspace}
        userEmail={session.email}
      >
        {children}
      </ProtectedShell>
    </WorkspaceProvider>
  );
}
