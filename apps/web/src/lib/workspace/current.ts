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
 * Every workspace the signed-in user belongs to. RLS already scopes both
 * queries to their own rows; done as two plain selects rather than an
 * embedded resource join (`workspaces(...)`) since the hand-written
 * `Database` type (see lib/supabase/types.ts) doesn't model FK relationship
 * metadata that `@supabase/postgrest-js` needs to type that join.
 */
export const listMemberships = cache(async (): Promise<WorkspaceMembership[]> => {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: memberRows, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', session.userId);

  if (memberError) {
    throw memberError;
  }

  if (memberRows.length === 0) {
    return [];
  }

  const { data: workspaceRows, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name, slug, kind, plan_id')
    .in(
      'id',
      memberRows.map((row) => row.workspace_id),
    );

  if (workspaceError) {
    throw workspaceError;
  }

  const roleByWorkspaceId = new Map(memberRows.map((row) => [row.workspace_id, row.role]));

  return workspaceRows.map((ws) => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    kind: ws.kind,
    planId: ws.plan_id,
    role: roleByWorkspaceId.get(ws.id) ?? 'viewer',
  }));
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
