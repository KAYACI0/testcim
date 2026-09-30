import 'server-only';

import { answerKeySchema, scoreAnswer, totalScore } from '@testcim/shared';

import type { Database } from '@/lib/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

type AdminClient = SupabaseClient<Database>;

/**
 * Scores (or re-scores) one attempt from its raw `attempt_answers.answer`
 * against the question snapshot pinned at publish time
 * (`online_exam_items.question_revision_id` -> `question_revisions.snapshot`
 * -> never the live, editable `questions` row). Idempotent: safe to call
 * again for an already-scored attempt (e.g. after a teacher re-grades an
 * `open` item by hand — this only overwrites items that still have
 * `points === null`, so a manual grade sticks).
 *
 * Called both right after `/api/exam/submit` and lazily whenever a teacher
 * opens results for an attempt that `close_expired_exams()` auto-expired
 * (docs/adr/0004 — scoring logic lives once, in TS, not duplicated in SQL).
 */
export async function ensureAttemptScored(
  supabase: AdminClient,
  attemptId: string,
): Promise<{ score: number; maxScore: number; hasUngraded: boolean }> {
  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('id, online_exam_id, score, max_score')
    .eq('id', attemptId)
    .single();
  if (attemptError || !attempt) {
    throw new Error(`attempt_not_found: ${attemptId}`);
  }

  const { data: items, error: itemsError } = await supabase
    .from('online_exam_items')
    .select('id, question_revision_id, points_override, correct_override')
    .eq('online_exam_id', attempt.online_exam_id);
  if (itemsError || !items) {
    throw new Error(`items_not_found: ${attempt.online_exam_id}`);
  }

  const revisionIds = [...new Set(items.map((i) => i.question_revision_id))];
  const { data: revisions, error: revisionsError } = await supabase
    .from('question_revisions')
    .select('id, snapshot')
    .in('id', revisionIds);
  if (revisionsError || !revisions) {
    throw new Error('revisions_not_found');
  }
  const snapshotByRevisionId = new Map(revisions.map((r) => [r.id, r.snapshot]));

  const { data: answers } = await supabase
    .from('attempt_answers')
    .select('item_id, answer, points')
    .eq('attempt_id', attemptId);
  const answerByItemId = new Map((answers ?? []).map((a) => [a.item_id, a]));

  let hasUngraded = false;
  const scored: { points: number; maxPoints: number }[] = [];

  for (const item of items) {
    const snapshot = snapshotByRevisionId.get(item.question_revision_id);
    const maxPoints =
      item.points_override ?? (typeof snapshot?.points === 'number' ? snapshot.points : 1);
    const existing = answerByItemId.get(item.id);

    // Already graded (either auto-scored before, or a teacher's manual
    // grade for an `open` item) — keep it as-is.
    if (existing?.points !== null && existing?.points !== undefined) {
      scored.push({ points: existing.points, maxPoints });
      continue;
    }

    const rawCorrect = item.correct_override ?? snapshot?.correct;
    const correctParsed = answerKeySchema.safeParse(rawCorrect);
    if (!existing || !correctParsed.success) {
      hasUngraded = existing ? true : false;
      scored.push({ points: 0, maxPoints });
      continue;
    }

    const isCorrect = scoreAnswer(correctParsed.data, existing.answer);
    if (isCorrect === null) {
      // `open`: needs a teacher's rubric grade.
      hasUngraded = true;
      scored.push({ points: 0, maxPoints });
      continue;
    }

    const points = isCorrect ? maxPoints : 0;
    scored.push({ points, maxPoints });
    await supabase
      .from('attempt_answers')
      .update({ is_correct: isCorrect, points })
      .eq('attempt_id', attemptId)
      .eq('item_id', item.id);
  }

  const { score, maxScore } = totalScore(scored);
  await supabase.from('exam_attempts').update({ score, max_score: maxScore }).eq('id', attemptId);

  return { score, maxScore, hasUngraded };
}
