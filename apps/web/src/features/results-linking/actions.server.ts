'use server';

import { linkResultsInputSchema } from '@testcim/shared';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { requireRole } from '@/lib/workspace/entitlements.server';

export interface UnmatchedExamAttempt {
  readonly kind: 'exam_attempt';
  readonly id: string;
  readonly displayName: string | null;
  readonly studentNo: string | null;
  readonly examTitle: string;
  readonly submittedAt: string | null;
}

export interface UnmatchedOmrScan {
  readonly kind: 'omr_scan';
  readonly id: string;
  readonly studentNoRead: string | null;
  readonly needsReview: boolean;
  readonly createdAt: string;
}

export interface UnmatchedResults {
  readonly examAttempts: readonly UnmatchedExamAttempt[];
  readonly omrScans: readonly UnmatchedOmrScan[];
}

/**
 * Lists this class's unmatched exam_attempts/omr_scans rows.
 *
 * omr_scans reach a class through omr_sessions.class_id — a real FK. Online
 * exams carry no class FK at all (`docs/prompts/12` §6 leaves this
 * unspecified), so exam_attempts are matched heuristically: the student-typed
 * `class_label` free-text field is compared case-insensitively against the
 * class name. This is a best-effort surface, not a hard filter — attempts
 * with no class_label, or one that doesn't match, never show up here and
 * must be linked from a future general (class-less) results screen if one is
 * built (see docs/backlog.md).
 */
export async function getUnmatchedResults(classId: string): Promise<UnmatchedResults> {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data: klass } = await supabase
    .from('classes')
    .select('id, name')
    .eq('id', classId)
    .eq('workspace_id', workspace.id)
    .single();
  if (!klass) return { examAttempts: [], omrScans: [] };

  const { data: sessions } = await supabase
    .from('omr_sessions')
    .select('id, test_id')
    .eq('workspace_id', workspace.id)
    .eq('class_id', classId);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: scans } =
    sessionIds.length === 0
      ? { data: [] }
      : await supabase
          .from('omr_scans')
          .select('id, student_no_read, needs_review, created_at')
          .eq('workspace_id', workspace.id)
          .is('student_id', null)
          .in('session_id', sessionIds)
          .order('created_at', { ascending: false });

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('id, display_name, student_no, class_label, submitted_at, online_exam_id')
    .eq('workspace_id', workspace.id)
    .is('student_id', null)
    .ilike('class_label', klass.name)
    .order('submitted_at', { ascending: false });

  const examIds = [...new Set((attempts ?? []).map((a) => a.online_exam_id))];
  const { data: exams } =
    examIds.length === 0
      ? { data: [] as Array<{ id: string; title: string }> }
      : await supabase.from('online_exams').select('id, title').in('id', examIds);
  const examTitleById = new Map((exams ?? []).map((e) => [e.id, e.title]));

  return {
    examAttempts: (attempts ?? []).map((a) => ({
      kind: 'exam_attempt' as const,
      id: a.id,
      displayName: a.display_name,
      studentNo: a.student_no,
      examTitle: examTitleById.get(a.online_exam_id) ?? '',
      submittedAt: a.submitted_at,
    })),
    omrScans: (scans ?? []).map((s) => ({
      kind: 'omr_scan' as const,
      id: s.id,
      studentNoRead: s.student_no_read,
      needsReview: s.needs_review,
      createdAt: s.created_at,
    })),
  };
}

/** Bulk-links exam_attempts/omr_scans rows to students via the `link_attempts_to_students` RPC. */
export async function linkResults(rawInput: unknown) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const parsed = linkResultsInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('link_attempts_to_students', {
    p_workspace_id: workspace.id,
    p_links: parsed.data.links.map((link) => ({
      kind: link.kind,
      id: link.id,
      studentId: link.studentId,
    })),
  });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const, linked: data.linked };
}
