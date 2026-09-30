import 'server-only';

import { seededShuffle } from '@testcim/shared';

import { createAdminClient } from '@/lib/supabase/admin';

export interface StudentQuestionOption {
  readonly id: string;
  readonly text: string | null;
  readonly richText: Record<string, unknown> | null;
  readonly imageUrl: string | null;
}

export interface StudentQuestion {
  readonly itemId: string;
  readonly position: string;
  readonly kind: 'image' | 'rich';
  readonly questionType: string;
  readonly stemText: string | null;
  readonly stemRich: Record<string, unknown> | null;
  readonly stemImageUrl: string | null;
  readonly options: readonly StudentQuestionOption[];
  readonly points: number;
  readonly answer: unknown;
  /** How many blanks a `fill` question expects — the count is not sensitive, only the values are. */
  readonly blankCount: number | null;
}

/**
 * Builds the student-facing question list for one attempt: never includes
 * `correct` (docs/prompts/09 item 4 — "cevaplar asla istemciye gitmez").
 * Question/option order is shuffled deterministically per attempt when the
 * exam has shuffling on.
 */
export async function loadStudentQuestions(
  onlineExamId: string,
  attemptId: string,
  shuffleQuestions: boolean,
  shuffleOptions: boolean,
): Promise<StudentQuestion[]> {
  const admin = createAdminClient();

  const { data: items } = await admin
    .from('online_exam_items')
    .select('id, question_id, question_revision_id, position, points_override, correct_override')
    .eq('online_exam_id', onlineExamId)
    .order('position');
  if (!items || items.length === 0) return [];

  const revisionIds = [...new Set(items.map((i) => i.question_revision_id))];
  const { data: revisions } = await admin
    .from('question_revisions')
    .select('id, snapshot')
    .in('id', revisionIds);
  const snapshotByRevisionId = new Map((revisions ?? []).map((r) => [r.id, r.snapshot]));

  const { data: answers } = await admin
    .from('attempt_answers')
    .select('item_id, answer')
    .eq('attempt_id', attemptId);
  const answerByItemId = new Map((answers ?? []).map((a) => [a.item_id, a.answer]));

  const assetIds = new Set<string>();
  for (const item of items) {
    const snapshot = snapshotByRevisionId.get(item.question_revision_id);
    if (typeof snapshot?.stem_asset_id === 'string') assetIds.add(snapshot.stem_asset_id);
    const options = Array.isArray(snapshot?.options) ? snapshot.options : [];
    for (const opt of options) {
      if (isRecord(opt) && typeof opt.imageAssetId === 'string') assetIds.add(opt.imageAssetId);
    }
  }
  const urlByAssetId = await resolveSignedUrls(admin, [...assetIds]);

  let ordered = items;
  if (shuffleQuestions) {
    ordered = seededShuffle(items, `${attemptId}:questions`);
  }

  return ordered.map((item) => {
    const snapshot = snapshotByRevisionId.get(item.question_revision_id) ?? {};
    const rawOptions = Array.isArray(snapshot.options) ? snapshot.options : [];
    let options: StudentQuestionOption[] = rawOptions.filter(isRecord).map((opt) => ({
      id: String(opt.id),
      text: typeof opt.text === 'string' ? opt.text : null,
      richText: isRecord(opt.richText) ? opt.richText : null,
      imageUrl:
        typeof opt.imageAssetId === 'string' ? (urlByAssetId.get(opt.imageAssetId) ?? null) : null,
    }));
    if (shuffleOptions && options.length > 1) {
      options = seededShuffle(options, `${attemptId}:${item.id}:options`);
    }

    return {
      itemId: item.id,
      position: item.position,
      kind: (snapshot.kind as 'image' | 'rich') ?? 'rich',
      questionType: typeof snapshot.question_type === 'string' ? snapshot.question_type : 'mcq',
      stemText: typeof snapshot.stem_text === 'string' ? snapshot.stem_text : null,
      stemRich: isRecord(snapshot.stem_rich) ? snapshot.stem_rich : null,
      stemImageUrl:
        typeof snapshot.stem_asset_id === 'string'
          ? (urlByAssetId.get(snapshot.stem_asset_id) ?? null)
          : null,
      options,
      points: item.points_override ?? (typeof snapshot.points === 'number' ? snapshot.points : 1),
      answer: answerByItemId.get(item.id) ?? null,
      blankCount: blankCountOf(item.correct_override ?? snapshot.correct),
    };
  });
}

function blankCountOf(correct: unknown): number | null {
  if (!isRecord(correct) || !Array.isArray(correct.values)) return null;
  return correct.values.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function resolveSignedUrls(
  admin: ReturnType<typeof createAdminClient>,
  assetIds: readonly string[],
): Promise<Map<string, string>> {
  if (assetIds.length === 0) return new Map();
  const { data: assets } = await admin.from('assets').select('id, bucket, path').in('id', assetIds);
  const urlById = new Map<string, string>();
  for (const asset of assets ?? []) {
    const { data: signed } = await admin.storage
      .from(asset.bucket)
      .createSignedUrl(asset.path, 3600);
    if (signed) urlById.set(asset.id, signed.signedUrl);
  }
  return urlById;
}
