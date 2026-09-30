'use server';

import { z } from 'zod';

import { parseMentionedUserIds } from './mentions';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { requireRole } from '@/lib/workspace/entitlements.server';

const RESOURCE_TYPES = ['question', 'test'] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface CommentRow {
  readonly id: string;
  readonly author_id: string | null;
  readonly author_name: string;
  readonly body: string;
  readonly resolved_at: string | null;
  readonly created_at: string;
}

/** Comments on one question or test, oldest first, with the author's display name resolved. */
export async function listComments(
  resourceType: ResourceType,
  resourceId: string,
): Promise<CommentRow[]> {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data: comments } = await supabase
    .from('comments')
    .select('id, author_id, body, resolved_at, created_at')
    .eq('workspace_id', workspace.id)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: true });

  const authorIds = [
    ...new Set((comments ?? []).map((c) => c.author_id).filter((id) => id !== null)),
  ];
  const { data: profiles } =
    authorIds.length === 0
      ? { data: [] as Array<{ id: string; full_name: string | null }> }
      : await supabase.from('profiles').select('id, full_name').in('id', authorIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? '']));

  return (comments ?? []).map((c) => ({
    id: c.id,
    author_id: c.author_id,
    author_name: c.author_id ? (nameById.get(c.author_id) ?? '') : '',
    body: c.body,
    resolved_at: c.resolved_at,
    created_at: c.created_at,
  }));
}

const createCommentSchema = z.object({
  resourceType: z.enum(RESOURCE_TYPES),
  resourceId: z.uuid(),
  body: z.string().trim().min(1).max(4000),
});

/** Creates a comment and notifies any `@mentioned` workspace member. */
export async function createComment(rawInput: unknown) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const parsed = createCommentSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      workspace_id: workspace.id,
      resource_type: parsed.data.resourceType,
      resource_id: parsed.data.resourceId,
      author_id: session.userId,
      body: parsed.data.body,
    })
    .select('id')
    .single();
  if (error || !comment) return { ok: false as const, reason: error?.message ?? 'insert_failed' };

  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspace.id);
  const memberIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== session.userId);

  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', memberIds);
    const mentioned = parseMentionedUserIds(
      parsed.data.body,
      (profiles ?? []).map((p) => ({ id: p.id, fullName: p.full_name ?? '' })),
    );

    if (mentioned.length > 0) {
      await supabase.rpc('notify_comment_mentions', {
        p_workspace_id: workspace.id,
        p_comment_id: comment.id,
        p_mentioned_user_ids: mentioned,
      });
    }
  }

  return { ok: true as const, commentId: comment.id };
}

/** Marks a comment resolved (author or owner/admin — enforced by RLS). */
export async function resolveComment(commentId: string) {
  const session = await requireSession();
  await getCurrentWorkspace();
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .update({ resolved_at: new Date().toISOString(), resolved_by: session.userId })
    .eq('id', commentId);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

const APPROVAL_STATUSES = ['draft', 'in_review', 'approved'] as const;
const setApprovalStatusSchema = z.object({
  testId: z.uuid(),
  status: z.enum(APPROVAL_STATUSES),
});

/** `approved` requires owner/admin — enforced in `set_test_approval_status` itself, not just here. */
export async function setApprovalStatus(rawInput: unknown) {
  await requireSession();
  await getCurrentWorkspace();

  const parsed = setApprovalStatusSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_test_approval_status', {
    p_test_id: parsed.data.testId,
    p_status: parsed.data.status,
  });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

export interface SnapshotRow {
  readonly revision: number;
  readonly reason: string | null;
  readonly created_at: string;
}

const SNAPSHOT_HISTORY_LIMIT = 30;

/** Most recent revisions for a test's history panel, newest first. */
export async function listSnapshots(testId: string): Promise<SnapshotRow[]> {
  await requireSession();
  await getCurrentWorkspace();
  const supabase = await createClient();

  const { data } = await supabase
    .from('test_snapshots')
    .select('revision, reason, created_at')
    .eq('test_id', testId)
    .order('revision', { ascending: false })
    .limit(SNAPSHOT_HISTORY_LIMIT);
  return data ?? [];
}

/** Restores a test to an earlier revision's full state, as a new revision (owner/admin only). */
export async function restoreSnapshot(testId: string, revision: number) {
  await requireSession();
  await getCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('restore_test_snapshot', {
    p_test_id: testId,
    p_revision: revision,
  });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const, currentRevision: data.current_revision };
}
