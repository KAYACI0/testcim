import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import type { WorkspaceRole } from '@testcim/shared';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

export const CURRENT_WORKSPACE_COOKIE = 'tc_ws';

export interface WorkspaceMembership {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly kind: 'personal' | 'team';
  readonly planId: string;
  readonly role: WorkspaceRole;
}

/**
 * Every workspace the signed-in user belongs to. RLS scopes the membership
 * rows (and the embedded workspaces) to the caller.
 */
interface MembershipRow {
  readonly role: WorkspaceRole;
  readonly workspaces: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly kind: 'personal' | 'team';
    readonly plan_id: string;
  } | null;
}

export const listMemberships = cache(async (): Promise<WorkspaceMembership[]> => {
  const session = await requireSession();
  const supabase = await createClient();

  // One round trip: the embedded `workspaces` resource follows the
  // `workspace_members.workspace_id` foreign key. The hand-written `Database`
  // type has no relationship metadata, so the row shape is declared here.
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, slug, kind, plan_id)')
    .eq('user_id', session.userId)
    .returns<MembershipRow[]>();

  if (error) {
    throw error;
  }

  return data.flatMap((row) =>
    row.workspaces
      ? [
          {
            id: row.workspaces.id,
            name: row.workspaces.name,
            slug: row.workspaces.slug,
            kind: row.workspaces.kind,
            planId: row.workspaces.plan_id,
            role: row.role,
          },
        ]
      : [],
  );
});

/**
 * The active workspace for this request: the one named by the `tc_ws`
 * cookie if the user is still a member of it, otherwise their personal
 * workspace (or first membership as a fallback). Doesn't write the cookie —
 * Server Components can't — so switching workspaces goes through the
 * `setCurrentWorkspace` Server Action instead.
 */
export const getCurrentWorkspace = cache(async (): Promise<WorkspaceMembership> => {
  const memberships = await listMemberships();

  if (memberships.length === 0) {
    throw new Error('user_has_no_workspace');
  }

  const cookieStore = await cookies();
  const requestedId = cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value;
  const requested = memberships.find((ws) => ws.id === requestedId);

  return requested ?? memberships.find((ws) => ws.kind === 'personal') ?? memberships[0]!;
});
