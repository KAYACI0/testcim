'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { testItemRowSchema, testOpSchema, type TestOp } from '@testcim/shared';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

const TEST_TYPES = ['exam', 'test_paper', 'mock', 'written', 'worksheet', 'quiz'] as const;

const DEFAULT_SETTINGS = {
  pageSize: 'a4' as const,
  orientation: 'portrait' as const,
  columns: 1,
  margins: { top: 20, bottom: 20, left: 20, right: 20 },
  columnGap: 10,
  questionGap: 10,
  numberingFormat: 'numeric' as const,
  layoutMode: 'strict' as const,
  fitPagesScaleMin: 0.85,
};

export interface CreateTestState {
  readonly status: 'idle' | 'error';
  readonly message?: string;
}

const createTestSchema = z.object({
  title: z.string().trim().min(2).max(200),
  type: z.enum(TEST_TYPES),
});

export async function createTest(
  _prev: CreateTestState,
  formData: FormData,
): Promise<CreateTestState> {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace();
  const parsed = createTestSchema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'invalid_input' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tests')
    .insert({
      workspace_id: workspace.id,
      created_by: session.userId,
      title: parsed.data.title,
      type: parsed.data.type,
      settings: DEFAULT_SETTINGS,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { status: 'error', message: error?.message ?? 'create_failed' };
  }

  redirect(`/tests/${data.id}`);
}

export interface EditorData {
  readonly testId: string;
  readonly title: string;
  readonly baseRevision: number;
  readonly approvalStatus: 'draft' | 'in_review' | 'approved';
  readonly items: {
    id: string;
    position: string;
    questionId: string;
    questionRevisionId: string;
    correct: unknown;
    points: number | null;
    thumbnailUrl: string;
  }[];
}

/** Loads a test plus its items and each item's image thumbnail for the editor's initial render. */
export async function fetchEditorData(testId: string): Promise<EditorData> {
  const supabase = await createClient();

  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('id, title, revision, approval_status')
    .eq('id', testId)
    .single();

  if (testError || !test) {
    throw new Error('test_not_found');
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from('test_items')
    .select(
      'id, section_id, group_id, question_id, question_revision_id, position, points_override, correct_override, pinned',
    )
    .eq('test_id', testId);

  if (itemsError) {
    throw itemsError;
  }

  const items = itemRows.map((row) => testItemRowSchema.parse(row));

  const questionIds = [...new Set(items.map((item) => item.question_id))];
  const { data: questionRows } = questionIds.length
    ? await supabase.from('questions').select('id, stem_asset_id').in('id', questionIds)
    : { data: [] as { id: string; stem_asset_id: string | null }[] };

  const stemAssetByQuestionId = new Map((questionRows ?? []).map((q) => [q.id, q.stem_asset_id]));
  const assetIds = [
    ...new Set([...stemAssetByQuestionId.values()].filter((id): id is string => Boolean(id))),
  ];

  const { data: assetRows } = assetIds.length
    ? await supabase.from('assets').select('id, bucket, path').in('id', assetIds)
    : { data: [] as { id: string; bucket: string; path: string }[] };

  const pathByAssetId = new Map(
    (assetRows ?? []).map((a) => [a.id, { bucket: a.bucket, path: a.path }]),
  );

  const signedUrlByPath = new Map<string, string>();
  for (const asset of assetRows ?? []) {
    const { data: signed } = await supabase.storage
      .from(asset.bucket)
      .createSignedUrl(asset.path, 3600);
    if (signed) {
      signedUrlByPath.set(asset.path, signed.signedUrl);
    }
  }

  return {
    testId: test.id,
    title: test.title,
    baseRevision: test.revision,
    approvalStatus: test.approval_status,
    items: items.map((item) => {
      const assetId = stemAssetByQuestionId.get(item.question_id);
      const location = assetId ? pathByAssetId.get(assetId) : undefined;
      const thumbnailUrl = location ? (signedUrlByPath.get(location.path) ?? '') : '';

      return {
        id: item.id,
        position: item.position,
        questionId: item.question_id,
        questionRevisionId: item.question_revision_id,
        correct: item.correct_override,
        points: item.points_override,
        thumbnailUrl,
      };
    }),
  };
}

export interface ApplyOpsResult {
  readonly ok: boolean;
  readonly current_revision: number;
  readonly missing_ops?: TestOp[];
}

export async function applyOpsAction(
  testId: string,
  baseRevision: number,
  ops: TestOp[],
): Promise<ApplyOpsResult> {
  await requireSession();
  const validatedOps = ops.map((op) => testOpSchema.parse(op));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('apply_test_ops', {
    p_test_id: testId,
    p_base_revision: baseRevision,
    p_ops: validatedOps,
  });

  if (error) {
    throw error;
  }

  return data as ApplyOpsResult;
}
