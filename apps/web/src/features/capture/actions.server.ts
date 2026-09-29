'use server';

import { z } from 'zod';

import { limit as entitlementLimit, UNLIMITED } from '@testcim/shared';

import type {
  RegisterCapturedQuestionInput,
  RegisterCapturedQuestionResult,
} from './queue/processor';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/workspace/entitlements.server';

const inputSchema = z.object({
  testId: z.uuid(),
  itemId: z.uuid(),
  position: z.string().min(1),
  path: z.string().min(1),
  mime: z.string().min(1),
  bytes: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sha256: z.string().length(64),
  phash: z.string().length(16),
});

const BYTES_PER_MB = 1024 * 1024;
const MAX_APPLY_OPS_ATTEMPTS = 3;

/**
 * Registers an already-uploaded capture: creates the `assets` and
 * `questions` rows, then adds the resulting question to the test via
 * `apply_test_ops`. The file itself never passes through this server (it
 * went straight to Storage from the browser, docs/02 §2) — this only
 * writes metadata.
 */
export async function registerCapturedQuestion(
  rawInput: RegisterCapturedQuestionInput,
): Promise<RegisterCapturedQuestionResult> {
  const session = await requireSession();
  const parsed = inputSchema.safeParse(rawInput);

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

  if (!input.path.startsWith(`${workspaceId}/`)) {
    return { ok: false, reason: 'path_mismatch' };
  }

  const entitlements = await getEntitlements(workspaceId);
  const storageLimitMb = entitlementLimit(entitlements, 'storage_mb');

  if (storageLimitMb !== UNLIMITED) {
    const { data: usage } = await supabase
      .from('assets')
      .select('bytes')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null);
    const usedBytes = (usage ?? []).reduce((sum, row) => sum + row.bytes, 0);

    if ((usedBytes + input.bytes) / BYTES_PER_MB > storageLimitMb) {
      await supabase.storage.from('assets').remove([input.path]);
      return { ok: false, reason: 'storage_limit_exceeded' };
    }
  }

  let assetId: string;
  const { data: insertedAsset, error: assetError } = await supabase
    .from('assets')
    .insert({
      workspace_id: workspaceId,
      owner_id: session.userId,
      bucket: 'assets',
      path: input.path,
      kind: 'image',
      mime: input.mime,
      bytes: input.bytes,
      width: input.width,
      height: input.height,
      sha256: input.sha256,
      phash: input.phash,
      source: 'paste',
    })
    .select('id')
    .single();

  if (assetError) {
    // Unique violation on (workspace_id, sha256, kind): identical content
    // was already uploaded. Reuse it instead of failing — content-level
    // dedup, distinct from the "already in this test" UI warning, which is
    // handled client-side against the currently loaded items.
    if (assetError.code === '23505') {
      const { data: existing } = await supabase
        .from('assets')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('sha256', input.sha256)
        .eq('kind', 'image')
        .single();
      await supabase.storage.from('assets').remove([input.path]);
      if (!existing) {
        return { ok: false, reason: 'asset_conflict' };
      }
      assetId = existing.id;
    } else {
      return { ok: false, reason: assetError.message };
    }
  } else {
    assetId = insertedAsset.id;
  }

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .insert({
      workspace_id: workspaceId,
      created_by: session.userId,
      kind: 'image',
      question_type: 'mcq',
      stem_asset_id: assetId,
      option_count: 5,
      points: 1,
      source_meta: { source: 'paste' },
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
