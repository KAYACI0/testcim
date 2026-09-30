'use server';

import { randomBytes } from 'node:crypto';

import { z } from 'zod';

import {
  difficultyP,
  discriminationIndex,
  kr20,
  mean,
  standardDeviation,
  type AttemptItemScore,
} from '@testcim/shared';

import { ensureAttemptScored } from './scoring.server';

import { requireSession } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { getEntitlements, requireRole } from '@/lib/workspace/entitlements.server';

function generateSlug(): string {
  return randomBytes(6).toString('base64url');
}

const publishExamSchema = z.object({
  testId: z.uuid(),
  title: z.string().min(1).max(200),
  mode: z.enum(['async', 'live']),
  access: z.enum(['link', 'code', 'roster']),
  joinCode: z.string().min(4).max(20).optional(),
  opensAt: z.iso.datetime().optional(),
  closesAt: z.iso.datetime().optional(),
  durationSec: z.number().int().positive().optional(),
  maxAttempts: z.number().int().positive().optional(),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  showResults: z.enum(['never', 'after_submit', 'after_close']).default('after_close'),
  showAnswers: z.boolean().default(false),
  requiredFields: z.object({
    displayName: z.boolean().default(true),
    studentNo: z.boolean().default(false),
    classLabel: z.boolean().default(false),
  }),
  participantCap: z.number().int().positive().optional(),
});

export type PublishExamInput = z.infer<typeof publishExamSchema>;

/**
 * Publishes a test as an online exam. Pins the test's current items to
 * their current question revision by copying them into
 * `online_exam_items` (docs/prompts/09 item 1) — later edits to the live
 * test never change an already-published exam.
 */
export async function publishExam(rawInput: unknown) {
  await requireSession();
  const parsed = publishExamSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('id, workspace_id')
    .eq('id', input.testId)
    .single();
  if (testError || !test) return { ok: false as const, reason: 'test_not_found' };

  await requireRole(test.workspace_id, ['owner', 'admin', 'editor']);

  if (input.mode === 'live') {
    const entitlements = await getEntitlements(test.workspace_id);
    if (entitlements.live_exams_concurrent >= 0) {
      const { count } = await supabase
        .from('online_exams')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', test.workspace_id)
        .eq('mode', 'live')
        .in('status', ['open', 'scheduled']);
      if ((count ?? 0) >= entitlements.live_exams_concurrent) {
        return { ok: false as const, reason: 'live_exams_limit_exceeded' };
      }
    }
  }

  const { data: items, error: itemsError } = await supabase
    .from('test_items')
    .select(
      'id, section_id, group_id, question_id, question_revision_id, position, points_override, correct_override',
    )
    .eq('test_id', input.testId);
  if (itemsError) return { ok: false as const, reason: itemsError.message };
  if (!items || items.length === 0) return { ok: false as const, reason: 'test_has_no_items' };

  const now = new Date();
  const opensAt = input.opensAt ? new Date(input.opensAt) : null;
  const status: 'scheduled' | 'open' = opensAt && opensAt > now ? 'scheduled' : 'open';

  const admin = createAdminClient();
  const { data: exam, error: examError } = await admin
    .from('online_exams')
    .insert({
      workspace_id: test.workspace_id,
      test_id: input.testId,
      title: input.title,
      mode: input.mode,
      access: input.access,
      join_code: input.access === 'code' ? (input.joinCode ?? generateSlug()) : null,
      slug: generateSlug(),
      opens_at: input.opensAt ?? null,
      closes_at: input.closesAt ?? null,
      duration_sec: input.durationSec ?? null,
      max_attempts: input.maxAttempts ?? null,
      shuffle_questions: input.shuffleQuestions,
      shuffle_options: input.shuffleOptions,
      show_results: input.showResults,
      show_answers: input.showAnswers,
      required_fields: input.requiredFields,
      status,
      participant_cap: input.participantCap ?? null,
    })
    .select('id, slug')
    .single();
  if (examError || !exam)
    return { ok: false as const, reason: examError?.message ?? 'publish_failed' };

  const { error: itemsInsertError } = await admin.from('online_exam_items').insert(
    items.map((item) => ({
      workspace_id: test.workspace_id,
      online_exam_id: exam.id,
      test_item_id: item.id,
      question_id: item.question_id,
      question_revision_id: item.question_revision_id,
      section_id: item.section_id,
      group_id: item.group_id,
      position: item.position,
      points_override: item.points_override,
      correct_override: item.correct_override,
    })),
  );
  if (itemsInsertError) return { ok: false as const, reason: itemsInsertError.message };

  return { ok: true as const, examId: exam.id, slug: exam.slug };
}

export async function listExams(testId?: string) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  let query = supabase
    .from('online_exams')
    .select('id, test_id, title, mode, access, slug, status, opens_at, closes_at, created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });
  if (testId) query = query.eq('test_id', testId);
  const { data, error } = await query;
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const, exams: data };
}

export async function closeExamNow(examId: string) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  // Verify ownership before touching the admin client below — that client
  // bypasses RLS entirely, so it must never run against an examId that
  // wasn't first confirmed to belong to this workspace via the RLS-checked
  // client.
  const { data: exam, error: examError } = await supabase
    .from('online_exams')
    .select('id')
    .eq('id', examId)
    .eq('workspace_id', workspace.id)
    .single();
  if (examError || !exam) return { ok: false as const, reason: 'exam_not_found' };

  const { error } = await supabase
    .from('online_exams')
    .update({ status: 'closed' })
    .eq('id', examId);
  if (error) return { ok: false as const, reason: error.message };

  const admin = createAdminClient();
  const { data: attempts } = await admin
    .from('exam_attempts')
    .update({ status: 'expired', submitted_at: new Date().toISOString() })
    .eq('online_exam_id', examId)
    .eq('status', 'in_progress')
    .select('id');
  for (const attempt of attempts ?? []) {
    await ensureAttemptScored(admin, attempt.id);
  }
  return { ok: true as const };
}

export interface ExamResultRow {
  readonly attemptId: string;
  readonly displayName: string | null;
  readonly studentNo: string | null;
  readonly classLabel: string | null;
  readonly status: 'in_progress' | 'submitted' | 'expired';
  readonly score: number | null;
  readonly maxScore: number | null;
  readonly correctCount: number;
  readonly incorrectCount: number;
  readonly blankCount: number;
  readonly durationSec: number | null;
  readonly flags: Record<string, unknown>;
}

export interface ItemAnalysisRow {
  readonly itemId: string;
  readonly questionId: string;
  readonly difficulty: number | null;
  readonly discrimination: number | null;
}

export async function getExamResults(examId: string) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data: exam, error: examError } = await supabase
    .from('online_exams')
    .select('id, workspace_id')
    .eq('id', examId)
    .eq('workspace_id', workspace.id)
    .single();
  if (examError || !exam) return { ok: false as const, reason: 'exam_not_found' };

  const admin = createAdminClient();
  const { data: attempts } = await admin
    .from('exam_attempts')
    .select(
      'id, display_name, student_no, class_label, status, score, max_score, started_at, submitted_at, flags',
    )
    .eq('online_exam_id', examId);

  for (const attempt of attempts ?? []) {
    if (attempt.status !== 'in_progress' && attempt.score === null) {
      await ensureAttemptScored(admin, attempt.id);
    }
  }

  const { data: rescored } = await admin
    .from('exam_attempts')
    .select(
      'id, display_name, student_no, class_label, status, score, max_score, started_at, submitted_at, flags',
    )
    .eq('online_exam_id', examId);

  const { data: items } = await admin
    .from('online_exam_items')
    .select('id, question_id')
    .eq('online_exam_id', examId);

  const { data: allAnswers } = await admin
    .from('attempt_answers')
    .select('attempt_id, item_id, is_correct, points')
    .in(
      'attempt_id',
      (rescored ?? []).map((a) => a.id),
    );

  const answersByAttempt = new Map<string, typeof allAnswers>();
  for (const answer of allAnswers ?? []) {
    const list = answersByAttempt.get(answer.attempt_id) ?? [];
    list.push(answer);
    answersByAttempt.set(answer.attempt_id, list);
  }

  const results: ExamResultRow[] = (rescored ?? []).map((attempt) => {
    const answers = answersByAttempt.get(attempt.id) ?? [];
    const correctCount = answers.filter((a) => a.is_correct === true).length;
    const incorrectCount = answers.filter((a) => a.is_correct === false).length;
    const blankCount = (items?.length ?? 0) - answers.length;
    const durationSec =
      attempt.started_at && attempt.submitted_at
        ? Math.round(
            (new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) /
              1000,
          )
        : null;
    return {
      attemptId: attempt.id,
      displayName: attempt.display_name,
      studentNo: attempt.student_no,
      classLabel: attempt.class_label,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.max_score,
      correctCount,
      incorrectCount,
      blankCount,
      durationSec,
      flags: attempt.flags,
    };
  });

  const totalScoreByAttemptId = new Map(results.map((r) => [r.attemptId, r.score ?? 0]));

  const itemAnalysis: ItemAnalysisRow[] = (items ?? []).map((item) => {
    const scores: AttemptItemScore[] = (rescored ?? [])
      .filter((a) => a.status !== 'in_progress')
      .map((a) => {
        const answer = (answersByAttempt.get(a.id) ?? []).find((ans) => ans.item_id === item.id);
        return { attemptId: a.id, correctness: answer?.is_correct ? 1 : 0 };
      });
    return {
      itemId: item.id,
      questionId: item.question_id,
      difficulty: difficultyP(scores),
      discrimination: discriminationIndex(scores, totalScoreByAttemptId),
    };
  });

  const submittedScores = results
    .filter((r) => r.status !== 'in_progress' && r.score !== null)
    .map((r) => r.score!);
  const itemCorrectnessMatrix = (items ?? []).map((item) =>
    (rescored ?? [])
      .filter((a) => a.status !== 'in_progress')
      .map((a) => {
        const answer = (answersByAttempt.get(a.id) ?? []).find((ans) => ans.item_id === item.id);
        return answer?.is_correct ? 1 : 0;
      }),
  );

  return {
    ok: true as const,
    results,
    itemAnalysis,
    summary: {
      mean: mean(submittedScores),
      standardDeviation: standardDeviation(submittedScores),
      kr20: kr20(itemCorrectnessMatrix),
      participantCount: results.length,
    },
  };
}

const regradeSchema = z.object({
  attemptId: z.uuid(),
  itemId: z.uuid(),
  points: z.number().min(0),
});

/** Manually grades an `open` item; `ensureAttemptScored` treats a non-null points as final. */
export async function regradeOpenAnswer(rawInput: unknown) {
  await requireSession();
  const parsed = regradeSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('attempt_answers')
    .update({ is_correct: null, points: parsed.data.points })
    .eq('attempt_id', parsed.data.attemptId)
    .eq('item_id', parsed.data.itemId)
    .eq('workspace_id', workspace.id)
    .select('attempt_id');
  if (error) return { ok: false as const, reason: error.message };
  if (!updated || updated.length === 0) return { ok: false as const, reason: 'answer_not_found' };

  await ensureAttemptScored(admin, parsed.data.attemptId);
  return { ok: true as const };
}
