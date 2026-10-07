'use server';

import { randomBytes, createHash } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import type { WorkspaceRole } from '@testcim/shared';

import { CURRENT_WORKSPACE_COOKIE } from './current';

import { writeAuditLog } from '@/lib/audit';
import { requireSession } from '@/lib/auth/dal';
import { sendInviteEmail } from '@/lib/email/notifications.server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/workspace/entitlements.server';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `${base || 'calisma-alani'}-${randomBytes(3).toString('hex')}`;
}

export interface WorkspaceActionState {
  readonly status: 'idle' | 'error';
  readonly message?: string;
}

const createWorkspaceSchema = z.object({ name: z.string().trim().min(2).max(80) });

export async function createTeamWorkspace(
  _prev: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const session = await requireSession();
  const parsed = createWorkspaceSchema.safeParse({ name: formData.get('name') });

  if (!parsed.success) {
    return { status: 'error', message: 'invalid_name' };
  }

  const supabase = await createClient();
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      kind: 'team',
      owner_id: session.userId,
    })
    .select('id')
    .single();

  if (error || !workspace) {
    return { status: 'error', message: error?.message ?? 'create_failed' };
  }

  await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: session.userId, role: 'owner' });

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_WORKSPACE_COOKIE, workspace.id, { httpOnly: true, sameSite: 'lax' });
  revalidatePath('/', 'layout');

  return { status: 'idle' };
}

export async function switchWorkspace(formData: FormData): Promise<void> {
  await requireSession();
  const workspaceId = formData.get('workspaceId');

  if (typeof workspaceId !== 'string') {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_WORKSPACE_COOKIE, workspaceId, { httpOnly: true, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}

const inviteSchema = z.object({
  workspaceId: z.uuid(),
  email: z.email(),
  role: z.enum(['admin', 'editor', 'viewer'] as const satisfies readonly WorkspaceRole[]),
});

/**
 * Creates the invite row, emails the one-time accept link when Resend is configured, and
 * returns the link either way so the inviting admin/owner can still share it by hand.
 */
export async function inviteMember(
  _prev: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState & { inviteUrl?: string; emailedTo?: string }> {
  const session = await requireSession();
  const parsed = inviteSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    email: formData.get('email'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'invalid_input' };
  }

  await requireRole(parsed.data.workspaceId, ['owner', 'admin']);

  const token = randomBytes(24).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const supabase = await createClient();

  const { error } = await supabase.from('workspace_invites').insert({
    workspace_id: parsed.data.workspaceId,
    email: parsed.data.email,
    role: parsed.data.role,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    return { status: 'error', message: error.message };
  }

  await writeAuditLog(supabase, {
    workspaceId: parsed.data.workspaceId,
    actorId: session.userId,
    action: 'workspace_invite_created',
    targetType: 'workspace_invite',
    meta: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath('/settings/members');

  const [{ data: workspace }, { data: inviter }] = await Promise.all([
    supabase.from('workspaces').select('name').eq('id', parsed.data.workspaceId).single(),
    supabase.from('profiles').select('full_name').eq('id', session.userId).single(),
  ]);
  const emailResult = await sendInviteEmail({
    to: parsed.data.email,
    token,
    role: parsed.data.role,
    workspaceName: workspace?.name ?? '',
    inviterName: inviter?.full_name ?? null,
  });

  return {
    status: 'idle',
    inviteUrl: `/invite/${token}`,
    ...(emailResult.ok ? { emailedTo: parsed.data.email } : {}),
  };
}

export interface AcceptInviteState {
  readonly status: 'idle' | 'error';
  readonly message?: string;
}

export async function acceptInvite(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const session = await requireSession();
  const token = formData.get('token');

  if (typeof token !== 'string' || !token) {
    return { status: 'error', message: 'invite_not_found' };
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  // Uses the service role: an invite row belongs to a workspace the invitee
  // isn't a member of yet, so RLS would otherwise hide it from them.
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from('workspace_invites')
    .select('id, workspace_id, role, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !invite) {
    return { status: 'error', message: 'invite_not_found' };
  }

  if (invite.accepted_at) {
    return { status: 'error', message: 'invite_already_used' };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { status: 'error', message: 'invite_expired' };
  }

  const { error: memberError } = await admin
    .from('workspace_members')
    .insert({ workspace_id: invite.workspace_id, user_id: session.userId, role: invite.role });

  if (memberError) {
    return { status: 'error', message: 'already_member' };
  }

  await admin
    .from('workspace_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  await writeAuditLog(admin, {
    workspaceId: invite.workspace_id,
    actorId: session.userId,
    action: 'workspace_invite_accepted',
    targetType: 'workspace_member',
    targetId: session.userId,
  });

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_WORKSPACE_COOKIE, invite.workspace_id, {
    httpOnly: true,
    sameSite: 'lax',
  });

  redirect('/home');
}

const roleChangeSchema = z.object({
  workspaceId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(['owner', 'admin', 'editor', 'viewer'] as const satisfies readonly WorkspaceRole[]),
});

export async function changeMemberRole(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = roleChangeSchema.parse({
    workspaceId: formData.get('workspaceId'),
    userId: formData.get('userId'),
    role: formData.get('role'),
  });

  await requireRole(parsed.workspaceId, ['owner', 'admin']);

  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_members')
    .update({ role: parsed.role })
    .eq('workspace_id', parsed.workspaceId)
    .eq('user_id', parsed.userId);

  if (!error) {
    await writeAuditLog(supabase, {
      workspaceId: parsed.workspaceId,
      actorId: session.userId,
      action: 'workspace_member_role_changed',
      targetType: 'workspace_member',
      targetId: parsed.userId,
      meta: { role: parsed.role },
    });
  }

  revalidatePath('/settings/members');
}

const removeMemberSchema = z.object({ workspaceId: z.uuid(), userId: z.uuid() });

export async function removeMember(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = removeMemberSchema.parse({
    workspaceId: formData.get('workspaceId'),
    userId: formData.get('userId'),
  });

  await requireRole(parsed.workspaceId, ['owner', 'admin']);

  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', parsed.workspaceId)
    .eq('user_id', parsed.userId);

  if (!error) {
    await writeAuditLog(supabase, {
      workspaceId: parsed.workspaceId,
      actorId: session.userId,
      action: 'workspace_member_removed',
      targetType: 'workspace_member',
      targetId: parsed.userId,
    });
  }

  revalidatePath('/settings/members');
}
