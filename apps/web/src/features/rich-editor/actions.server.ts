'use server';

import { z } from 'zod';

import {
  answerKeySchema,
  limit as entitlementLimit,
  questionOptionsSchema,
  richDocSchema,
  UNLIMITED,
} from '@testcim/shared';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/workspace/entitlements.server';

const BYTES_PER_MB = 1024 * 1024;
const MAX_APPLY_OPS_ATTEMPTS = 3;

const renderAssetSchema = z.object({
  path: z.string().min(1),
  mime: z.string().min(1),
  bytes: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sha256: z.string().length(64),
});

const QUESTION_TYPES = ['mcq', 'tf', 'fill', 'match', 'open', 'numeric', 'order'] as const;

const saveRichQuestionSchema = z.object({
  testId: z.uuid(),
  itemId: z.uuid(),
  position: z.string().min(1),
  render: renderAssetSchema,
  questionType: z.enum(QUESTION_TYPES),
  stemRich: richDocSchema,
  options: questionOptionsSchema,
  correct: answerKeySchema.nullable(),
  points: z.number().positive(),
  explanationRich: richDocSchema.nullable(),
});

export type SaveRichQuestionInput = z.infer<typeof saveRichQuestionSchema>;

export type SaveRichQuestionResult =
  | { readonly ok: true; readonly questionId: string; readonly questionRevisionId: string }
  | { readonly ok: false; readonly reason: string };

async function chargeRenderAsset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  ownerId: string,
  render: z.infer<typeof renderAssetSchema>,
): Promise<{ ok: true; assetId: string } | { ok: false; reason: string }> {
  const entitlements = await getEntitlements(workspaceId);
  const storageLimitMb = entitlementLimit(entitlements, 'storage_mb');

  if (storageLimitMb !== UNLIMITED) {
    const { data: usage } = await supabase
      .from('assets')
      .select('bytes')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null);
    const usedBytes = (usage ?? []).reduce((sum, row) => sum + row.bytes, 0);

    if ((usedBytes + render.bytes) / BYTES_PER_MB > storageLimitMb) {
      await supabase.storage.from('assets').remove([render.path]);
      return { ok: false, reason: 'storage_limit_exceeded' };
    }
  }

  const { data: inserted, error } = await supabase
    .from('assets')
    .insert({
      workspace_id: workspaceId,
      owner_id: ownerId,
      bucket: 'assets',
      path: render.path,
      kind: 'render',
      mime: render.mime,
      bytes: render.bytes,
      width: render.width,
      height: render.height,
      sha256: render.sha256,
      source: 'rich_render',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('assets')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('sha256', render.sha256)
        .eq('kind', 'render')
        .single();
      await supabase.storage.from('assets').remove([render.path]);
      if (!existing) {
        return { ok: false, reason: 'asset_conflict' };
      }
      return { ok: true, assetId: existing.id };
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true, assetId: inserted.id };
}

/**
 * Saves a question written directly in the rich editor (docs/prompts/07):
 * uploads the already-rendered high-DPI PNG's metadata (the file itself
 * went straight to Storage from the browser, same as the capture pipeline —
 * docs/02 §2 body-size limit), creates the `questions`/`question_revisions`
 * rows with `kind = 'rich'`, then adds it to the test via `apply_test_ops`,
 * exactly like `registerCapturedQuestion` does for a pasted screenshot.
 */
export async function saveRichQuestion(
  rawInput: SaveRichQuestionInput,
): Promise<SaveRichQuestionResult> {
  const session = await requireSession();
  const parsed = saveRichQuestionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_input' };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('workspace_id')
    .eq('id', input.testId)
    .single();

  if (testError || !test) {
    return { ok: false, reason: 'test_not_found' };
  }
  const workspaceId = test.workspace_id;

  if (!input.render.path.startsWith(`${workspaceId}/`)) {
    return { ok: false, reason: 'path_mismatch' };
  }

  const asset = await chargeRenderAsset(supabase, workspaceId, session.userId, input.render);
  if (!asset.ok) {
    return asset;
  }

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .insert({
      workspace_id: workspaceId,
      created_by: session.userId,
      kind: 'rich',
      question_type: input.questionType,
      stem_asset_id: asset.assetId,
      stem_rich: input.stemRich,
      options: input.options,
      option_count: input.options.length || null,
      correct: input.correct,
      points: input.points,
      explanation_rich: input.explanationRich,
      source_meta: { source: 'rich_editor' },
    })
    .select('id')
    .single();

  if (questionError || !question) {
    return { ok: false, reason: questionError?.message ?? 'question_create_failed' };
  }

  const { data: revisionRow, error: revisionError } = await supabase
    .from('question_revisions')
    .select('id')
    .eq('question_id', question.id)
    .eq('revision', 1)
    .single();

  if (revisionError || !revisionRow) {
    return { ok: false, reason: 'question_revision_missing' };
  }

  for (let attempt = 0; attempt < MAX_APPLY_OPS_ATTEMPTS; attempt += 1) {
    const { data: currentTest, error: currentTestError } = await supabase
      .from('tests')
      .select('revision')
      .eq('id', input.testId)
      .single();

    if (currentTestError || !currentTest) {
      return { ok: false, reason: 'test_not_found' };
    }

    const { data: applyResult, error: applyError } = await supabase.rpc('apply_test_ops', {
      p_test_id: input.testId,
      p_base_revision: currentTest.revision,
      p_ops: [
        {
          type: 'add_item',
          item_id: input.itemId,
          question_id: question.id,
          question_revision_id: revisionRow.id,
          position: input.position,
        },
      ],
    });

    if (applyError) {
      const reason = applyError.message.includes('usage_limit_exceeded')
        ? 'usage_limit_exceeded'
        : applyError.message;
      return { ok: false, reason };
    }

    const result = applyResult as { ok: boolean };
    if (result.ok) {
      return { ok: true, questionId: question.id, questionRevisionId: revisionRow.id };
    }
    // Revision conflict from a concurrent edit: retry with the fresh revision.
  }

  return { ok: false, reason: 'apply_ops_conflict' };
}

const saveGroupPassageSchema = z.object({
  testId: z.uuid(),
  groupId: z.uuid().nullable(),
  passageRich: richDocSchema,
});

export type SaveGroupPassageResult =
  { readonly ok: true; readonly groupId: string } | { readonly ok: false; readonly reason: string };

/**
 * Creates or updates a `test_groups` row's passage (docs/prompts/07 §7),
 * through the same `apply_test_ops` op log as every other test mutation —
 * `add_group`/`update_group` were added for exactly this (see
 * supabase/migrations/20250101000015_rich_question_groups.sql).
 */
export async function saveGroupPassage(
  rawInput: z.infer<typeof saveGroupPassageSchema>,
): Promise<SaveGroupPassageResult> {
  await requireSession();
  const parsed = saveGroupPassageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_input' };
  }
  const input = parsed.data;
  const supabase = await createClient();

  const groupId = input.groupId ?? crypto.randomUUID();

  for (let attempt = 0; attempt < MAX_APPLY_OPS_ATTEMPTS; attempt += 1) {
    const { data: currentTest, error: currentTestError } = await supabase
      .from('tests')
      .select('revision')
      .eq('id', input.testId)
      .single();

    if (currentTestError || !currentTest) {
      return { ok: false, reason: 'test_not_found' };
    }

    const { data: applyResult, error: applyError } = await supabase.rpc('apply_test_ops', {
      p_test_id: input.testId,
      p_base_revision: currentTest.revision,
      p_ops: [
        {
          type: input.groupId ? 'update_group' : 'add_group',
          group_id: groupId,
          passage_rich: input.passageRich,
        },
      ],
    });

    if (applyError) {
      return { ok: false, reason: applyError.message };
    }

    const result = applyResult as { ok: boolean };
    if (result.ok) {
      return { ok: true, groupId };
    }
  }

  return { ok: false, reason: 'apply_ops_conflict' };
}
