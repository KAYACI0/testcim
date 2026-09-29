'use server';

import { z } from 'zod';

import { bankFilterSchema, bulkTagInputSchema } from '@testcim/shared';

import { resolveDuplicateLookup } from './dedupe';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { getEntitlements, requireRole } from '@/lib/workspace/entitlements.server';

const PAGE_SIZE = 50;

export interface TagRow {
  readonly id: string;
  readonly name: string;
}

export interface BankQuestionRow {
  readonly id: string;
  readonly kind: 'image' | 'rich';
  readonly question_type: string;
  readonly stem_text: string | null;
  readonly thumb_asset_id: string | null;
  readonly stem_asset_id: string | null;
  readonly thumbnailUrl: string;
  readonly difficulty: number | null;
  readonly ai_review_status: 'draft' | 'approved' | null;
  readonly folder_id: string | null;
  readonly created_by: string | null;
  readonly created_at: string;
}

export interface ListBankQuestionsResult {
  readonly ok: true;
  readonly questions: readonly BankQuestionRow[];
  readonly nextCursor: string | null;
  readonly quotaWarning: boolean;
}

async function resolveThumbnailUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assetIds: readonly string[],
): Promise<Map<string, string>> {
  if (assetIds.length === 0) return new Map();
  const { data: assets } = await supabase
    .from('assets')
    .select('id, bucket, path')
    .in('id', assetIds);

  const urlById = new Map<string, string>();
  for (const asset of assets ?? []) {
    const { data: signed } = await supabase.storage
      .from(asset.bucket)
      .createSignedUrl(asset.path, 3600);
    if (signed) urlById.set(asset.id, signed.signedUrl);
  }
  return urlById;
}

/**
 * Filters + searches the bank (docs/prompts/08 items 2-3). Search runs
 * through `stem_text`'s trigram/FTS index (Turkish-normalized by the
 * `questions_update_search` trigger); visual (`kind = 'image'`) questions
 * have no `stem_text` yet (OCR lands in Prompt 11), so a text search only
 * matches rich questions and tag/metadata filters until then.
 */
export async function listBankQuestions(
  rawFilter: unknown,
  cursor: string | null,
): Promise<ListBankQuestionsResult | { ok: false; reason: string }> {
  await requireSession();
  const parsed = bankFilterSchema.safeParse(rawFilter ?? {});
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_input' };
  }
  const filter = parsed.data;
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  let query = supabase
    .from('questions')
    .select(
      'id, kind, question_type, stem_text, thumb_asset_id, stem_asset_id, difficulty, ai_review_status, folder_id, created_by, created_at',
    )
    .eq('workspace_id', workspace.id)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (filter.folderId === null) {
    query = query.is('folder_id', null);
  } else if (filter.folderId) {
    query = query.eq('folder_id', filter.folderId);
  }
  if (filter.subjectId) query = query.eq('subject_id', filter.subjectId);
  if (filter.topicId) query = query.eq('topic_id', filter.topicId);
  if (filter.difficulty) query = query.eq('difficulty', filter.difficulty);
  if (filter.questionType) query = query.eq('question_type', filter.questionType);
  if (filter.createdBy) query = query.eq('created_by', filter.createdBy);
  if (filter.aiStatus) query = query.eq('ai_review_status', filter.aiStatus);
  if (filter.createdFrom) query = query.gte('created_at', filter.createdFrom);
  if (filter.createdTo) query = query.lte('created_at', filter.createdTo);
  if (filter.search && filter.search.trim()) {
    query = query.ilike('stem_text', `%${filter.search.trim()}%`);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  if (filter.outcomeId) {
    const { data: outcomeQuestionIds } = await supabase
      .from('question_outcomes')
      .select('question_id')
      .eq('outcome_id', filter.outcomeId);
    const ids = (outcomeQuestionIds ?? []).map((r) => r.question_id);
    if (ids.length === 0) {
      return { ok: true, questions: [], nextCursor: null, quotaWarning: false };
    }
    query = query.in('id', ids);
  }

  if (filter.tagIds && filter.tagIds.length > 0) {
    const { data: taggedIds } = await supabase
      .from('question_tags')
      .select('question_id')
      .in('tag_id', filter.tagIds);
    const ids = [...new Set((taggedIds ?? []).map((r) => r.question_id))];
    if (ids.length === 0) {
      return { ok: true, questions: [], nextCursor: null, quotaWarning: false };
    }
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false, reason: error.message };
  }

  const hasMore = data.length > PAGE_SIZE;
  const page = hasMore ? data.slice(0, PAGE_SIZE) : data;
  const nextCursor = hasMore ? (page[page.length - 1]?.created_at ?? null) : null;

  const entitlements = await getEntitlements(workspace.id);
  let quotaWarning = false;
  if (entitlements.bank_questions >= 0) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .is('deleted_at', null);
    quotaWarning = (count ?? 0) >= entitlements.bank_questions;
  }

  const assetIds = [
    ...new Set(
      page
        .map((q) => q.thumb_asset_id ?? (q.kind === 'image' ? q.stem_asset_id : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const urlByAssetId = await resolveThumbnailUrls(supabase, assetIds);

  const questions = page.map((q) => ({
    ...q,
    thumbnailUrl: urlByAssetId.get(q.thumb_asset_id ?? q.stem_asset_id ?? '') ?? '',
  }));

  return { ok: true, questions, nextCursor, quotaWarning };
}

const createFolderSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.uuid().nullable(),
});

export async function createFolder(rawInput: unknown) {
  await requireSession();
  const parsed = createFolderSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('folders')
    .insert({
      workspace_id: workspace.id,
      kind: 'questions',
      name: parsed.data.name,
      parent_id: parsed.data.parentId,
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false as const, reason: error?.message ?? 'create_failed' };
  return { ok: true as const, folderId: data.id };
}

const renameFolderSchema = z.object({ folderId: z.uuid(), name: z.string().min(1).max(120) });

export async function renameFolder(rawInput: unknown) {
  await requireSession();
  const parsed = renameFolderSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  const { error } = await supabase
    .from('folders')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.folderId)
    .eq('workspace_id', workspace.id);

  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

const moveFolderSchema = z.object({ folderId: z.uuid(), parentId: z.uuid().nullable() });

export async function moveFolder(rawInput: unknown) {
  await requireSession();
  const parsed = moveFolderSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };
  if (parsed.data.parentId === parsed.data.folderId) {
    return { ok: false as const, reason: 'cannot_be_own_parent' };
  }

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  const { error } = await supabase
    .from('folders')
    .update({ parent_id: parsed.data.parentId })
    .eq('id', parsed.data.folderId)
    .eq('workspace_id', workspace.id);

  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

const moveQuestionsSchema = z.object({
  questionIds: z.array(z.uuid()).min(1).max(500),
  folderId: z.uuid().nullable(),
});

export async function moveQuestionsToFolder(rawInput: unknown) {
  await requireSession();
  const parsed = moveQuestionsSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  const { error } = await supabase
    .from('questions')
    .update({ folder_id: parsed.data.folderId })
    .in('id', parsed.data.questionIds)
    .eq('workspace_id', workspace.id);

  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

const createTagSchema = z.object({ name: z.string().min(1).max(60) });

export async function createTag(rawInput: unknown) {
  await requireSession();
  const parsed = createTagSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tags')
    .upsert(
      { workspace_id: workspace.id, name: parsed.data.name },
      { onConflict: 'workspace_id,name' },
    )
    .select('id, name')
    .single();

  if (error || !data) return { ok: false as const, reason: error?.message ?? 'create_failed' };
  return { ok: true as const, tag: data };
}

export async function bulkTagQuestions(rawInput: unknown) {
  await requireSession();
  const parsed = bulkTagInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  const rows = parsed.data.questionIds.flatMap((questionId: string) =>
    parsed.data.tagIds.map((tagId: string) => ({
      workspace_id: workspace.id,
      question_id: questionId,
      tag_id: tagId,
    })),
  );

  const { error } = await supabase
    .from('question_tags')
    .upsert(rows, { onConflict: 'question_id,tag_id' });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

export async function untagQuestion(rawInput: unknown) {
  await requireSession();
  const parsed = z.object({ questionId: z.uuid(), tagId: z.uuid() }).safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  const { error } = await supabase
    .from('question_tags')
    .delete()
    .eq('workspace_id', workspace.id)
    .eq('question_id', parsed.data.questionId)
    .eq('tag_id', parsed.data.tagId);

  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

const setOutcomesSchema = z.object({ questionId: z.uuid(), outcomeIds: z.array(z.uuid()) });

/** Replaces a question's outcome tags wholesale (the tag picker sends the full set). */
export async function setQuestionOutcomes(rawInput: unknown) {
  await requireSession();
  const parsed = setOutcomesSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from('question_outcomes')
    .delete()
    .eq('workspace_id', workspace.id)
    .eq('question_id', parsed.data.questionId);
  if (deleteError) return { ok: false as const, reason: deleteError.message };

  if (parsed.data.outcomeIds.length > 0) {
    const { error: insertError } = await supabase.from('question_outcomes').insert(
      parsed.data.outcomeIds.map((outcomeId) => ({
        workspace_id: workspace.id,
        question_id: parsed.data.questionId,
        outcome_id: outcomeId,
      })),
    );
    if (insertError) return { ok: false as const, reason: insertError.message };
  }

  return { ok: true as const };
}

const listExistingSchema = z.object({ testId: z.uuid(), questionIds: z.array(z.uuid()) });

/** Which of `questionIds` already appear as items in `testId` (docs/prompts/08 item 5). */
export async function listExistingInTest(rawInput: unknown) {
  await requireSession();
  const parsed = listExistingSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };
  if (parsed.data.questionIds.length === 0) return { ok: true as const, existingQuestionIds: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('test_items')
    .select('question_id')
    .eq('test_id', parsed.data.testId)
    .in('question_id', parsed.data.questionIds);

  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const, existingQuestionIds: [...new Set(data.map((r) => r.question_id))] };
}

const addToTestSchema = z.object({
  testId: z.uuid(),
  questionIds: z.array(z.uuid()).min(1).max(200),
});

/**
 * Bankadan teste ekleme (docs/prompts/08 item 5): each question's current
 * revision is pinned via `add_item`, same mechanism the paste/crop/rich-
 * editor flows already use (`saveRichQuestion` etc).
 */
export async function addQuestionsToTest(rawInput: unknown) {
  await requireSession();
  const parsed = addToTestSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('id, revision')
    .eq('id', parsed.data.testId)
    .single();
  if (testError || !test) return { ok: false as const, reason: 'test_not_found' };

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, current_revision')
    .in('id', parsed.data.questionIds);
  if (questionsError || !questions) {
    return { ok: false as const, reason: questionsError?.message ?? 'questions_not_found' };
  }

  const { data: revisions, error: revisionsError } = await supabase
    .from('question_revisions')
    .select('id, question_id, revision')
    .in(
      'question_id',
      questions.map((q) => q.id),
    );
  if (revisionsError || !revisions) {
    return { ok: false as const, reason: revisionsError?.message ?? 'revisions_not_found' };
  }

  const revisionIdByQuestion = new Map(
    questions.map((q) => {
      const match = revisions.find(
        (r) => r.question_id === q.id && r.revision === q.current_revision,
      );
      return [q.id, match?.id ?? null] as const;
    }),
  );

  let position = 0;
  const ops = questions
    .filter((q) => revisionIdByQuestion.get(q.id))
    .map((q) => ({
      type: 'add_item' as const,
      item_id: crypto.randomUUID(),
      question_id: q.id,
      question_revision_id: revisionIdByQuestion.get(q.id)!,
      position: String(position++).padStart(6, '0'),
    }));

  const { data: applyResult, error: applyError } = await supabase.rpc('apply_test_ops', {
    p_test_id: parsed.data.testId,
    p_base_revision: test.revision,
    p_ops: ops,
  });
  if (applyError) return { ok: false as const, reason: applyError.message };

  const result = applyResult as { ok: boolean };
  if (!result.ok) return { ok: false as const, reason: 'revision_conflict' };
  return { ok: true as const, addedCount: ops.length };
}

const upgradeItemSchema = z.object({ testId: z.uuid(), itemId: z.uuid() });

/** "Güncel sürüme yükselt" (docs/prompts/08 item 7). */
export async function upgradeItemRevision(rawInput: unknown) {
  await requireSession();
  const parsed = upgradeItemSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('revision')
    .eq('id', parsed.data.testId)
    .single();
  if (testError || !test) return { ok: false as const, reason: 'test_not_found' };

  const { data: applyResult, error: applyError } = await supabase.rpc('apply_test_ops', {
    p_test_id: parsed.data.testId,
    p_base_revision: test.revision,
    p_ops: [{ type: 'upgrade_revision', item_id: parsed.data.itemId }],
  });
  if (applyError) return { ok: false as const, reason: applyError.message };

  const result = applyResult as { ok: boolean };
  if (!result.ok) return { ok: false as const, reason: 'revision_conflict' };
  return { ok: true as const };
}

export interface QuestionDetail {
  readonly id: string;
  readonly stemText: string | null;
  readonly thumbnailUrl: string;
  readonly difficulty: number | null;
  readonly sourceMeta: Record<string, unknown>;
  readonly currentRevision: number;
  readonly tags: readonly TagRow[];
  readonly outcomeIds: readonly string[];
  readonly usedInTests: readonly { readonly testId: string; readonly title: string }[];
  readonly revisions: readonly { readonly revision: number; readonly createdAt: string }[];
}

/** Powers the `/bank` inspector panel's four tabs in one round trip. */
export async function getQuestionDetail(
  questionId: string,
): Promise<{ ok: true; detail: QuestionDetail } | { ok: false; reason: string }> {
  await requireSession();
  const parsed = z.uuid().safeParse(questionId);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };

  const supabase = await createClient();
  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select(
      'id, stem_text, stem_asset_id, thumb_asset_id, kind, difficulty, source_meta, current_revision',
    )
    .eq('id', parsed.data)
    .single();
  if (questionError || !question) return { ok: false, reason: 'question_not_found' };

  const assetId =
    question.thumb_asset_id ?? (question.kind === 'image' ? question.stem_asset_id : null);
  const urlByAssetId = await resolveThumbnailUrls(supabase, assetId ? [assetId] : []);

  const [tagLinksRes, outcomeRowsRes, itemsRes, revisionsRes] = await Promise.all([
    supabase.from('question_tags').select('tag_id').eq('question_id', parsed.data),
    supabase.from('question_outcomes').select('outcome_id').eq('question_id', parsed.data),
    supabase.from('test_items').select('test_id').eq('question_id', parsed.data),
    supabase
      .from('question_revisions')
      .select('revision, created_at')
      .eq('question_id', parsed.data)
      .order('revision', { ascending: false }),
  ]);

  const tagIds = (tagLinksRes.data ?? []).map((r) => r.tag_id);
  const { data: tags } = tagIds.length
    ? await supabase.from('tags').select('id, name').in('id', tagIds)
    : { data: [] as TagRow[] };

  const testIds = [...new Set((itemsRes.data ?? []).map((r) => r.test_id))];
  const { data: testRows } = testIds.length
    ? await supabase.from('tests').select('id, title').in('id', testIds)
    : { data: [] as { id: string; title: string }[] };

  return {
    ok: true,
    detail: {
      id: question.id,
      stemText: question.stem_text,
      thumbnailUrl: assetId ? (urlByAssetId.get(assetId) ?? '') : '',
      difficulty: question.difficulty,
      sourceMeta: question.source_meta ?? {},
      currentRevision: question.current_revision,
      tags: tags ?? [],
      outcomeIds: (outcomeRowsRes.data ?? []).map((r) => r.outcome_id),
      usedInTests: (testRows ?? []).map((r) => ({ testId: r.id, title: r.title })),
      revisions: (revisionsRes.data ?? []).map((r) => ({
        revision: r.revision,
        createdAt: r.created_at,
      })),
    },
  };
}

const duplicatesSchema = z.object({
  sha256: z.string().nullable(),
  stemText: z.string().nullable(),
});

/**
 * Mükerrer tespiti (docs/prompts/08 item 6): image questions compare by
 * `assets.sha256` (exact) through `stem_asset_id`; rich questions have no
 * asset, so this falls back to an exact `stem_text` match. pHash-based near-
 * duplicate matching needs `assets.phash` bit-distance, which isn't
 * expressible as a plain filter — left for a follow-up once the bank has
 * enough volume to make it worth a dedicated RPC (see docs/backlog.md).
 */
export async function findDuplicates(rawInput: unknown) {
  await requireSession();
  const parsed = duplicatesSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const strategy = resolveDuplicateLookup({
    sha256: parsed.data.sha256,
    stemText: parsed.data.stemText,
  });

  if (strategy.kind === 'sha256') {
    const { data: asset } = await supabase
      .from('assets')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('sha256', strategy.value)
      .maybeSingle();
    if (asset) {
      const { data: matches } = await supabase
        .from('questions')
        .select('id, stem_text')
        .eq('workspace_id', workspace.id)
        .eq('stem_asset_id', asset.id)
        .is('deleted_at', null);
      return { ok: true as const, matches: matches ?? [] };
    }
  }

  if (strategy.kind === 'stem_text') {
    const { data: matches } = await supabase
      .from('questions')
      .select('id, stem_text')
      .eq('workspace_id', workspace.id)
      .eq('stem_text', strategy.value)
      .is('deleted_at', null);
    return { ok: true as const, matches: matches ?? [] };
  }

  return { ok: true as const, matches: [] };
}
