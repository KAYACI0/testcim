'use server';

import { z } from 'zod';

import {
  AI_CREDIT_COSTS,
  MAX_AI_OPTIONS,
  distractorsOutputSchema,
  generateQuestionsInputSchema,
  generateQuestionsOutputSchema,
  imageToTextOutputSchema,
  normalizeAiQuestions,
  qualityCheckOutputSchema,
  richDocToText,
  textToRichDoc,
  updateDraftInputSchema,
  limit as entitlementLimit,
  type AiQuestionType,
  type AnswerKey,
  type NormalizedAiQuestion,
  type StoredQualityCheck,
} from '@testcim/shared';

import { refundAiCredits } from './credits';
import { buildAnswerKey, buildDraftFields, buildOptions } from './draft-rows';
import { toAiFailureReason } from './failure';
import { loadPromptTemplate } from './prompts/loader';
import { executeAiJob } from './run-ai-job.server';

import type { AiImageInput } from './types';

import { chargeRenderAsset, renderAssetSchema } from '@/features/rich-editor/render-asset.server';
import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { getEntitlements, requireRole } from '@/lib/workspace/entitlements.server';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TOKENS_PER_GENERATED_QUESTION = 1200;
const IMAGE_MEDIA_TYPES: Record<string, AiImageInput['mediaType']> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/webp': 'image/webp',
};

type Failure = { readonly ok: false; readonly reason: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function editorContext() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);
  const supabase = await createClient();

  return { session, workspace, supabase };
}

async function creditBalance(supabase: Supabase, workspaceId: string): Promise<number> {
  const { data } = await supabase
    .from('credit_ledger')
    .select('delta')
    .eq('workspace_id', workspaceId);

  return (data ?? []).reduce((sum, row) => sum + row.delta, 0);
}

export interface AiCreditsInfo {
  readonly balance: number;
  /** False when the plan grants no AI credits at all (the feature is locked). */
  readonly enabled: boolean;
  readonly costs: {
    readonly generateQuestions: number;
    readonly imageToText: number;
    readonly generateDistractors: number;
    readonly qualityCheck: number;
  };
}

/** Balance and per-action costs, shown before the teacher spends credits. */
export async function getAiCreditsInfo(): Promise<AiCreditsInfo> {
  const { workspace, supabase } = await editorContext();
  const entitlements = await getEntitlements(workspace.id);
  const monthly = entitlementLimit(entitlements, 'ai_credits_per_month');

  return {
    balance: await creditBalance(supabase, workspace.id),
    enabled: monthly !== 0,
    costs: {
      generateQuestions: AI_CREDIT_COSTS.generate_questions,
      imageToText: AI_CREDIT_COSTS.image_to_text,
      generateDistractors: AI_CREDIT_COSTS.generate_distractors,
      qualityCheck: AI_CREDIT_COSTS.quality_check,
    },
  };
}

interface QuestionForAi {
  readonly id: string;
  readonly kind: 'image' | 'rich';
  readonly question_type: string;
  readonly stem_text: string | null;
  readonly stem_asset_id: string | null;
  readonly options: unknown;
  readonly correct: unknown;
  readonly explanation_rich: unknown;
  readonly difficulty: number | null;
  readonly subject_id: string | null;
  readonly topic_id: string | null;
  readonly source_meta: unknown;
}

async function loadQuestion(
  supabase: Supabase,
  workspaceId: string,
  questionId: string,
): Promise<QuestionForAi | null> {
  const { data } = await supabase
    .from('questions')
    .select(
      'id, kind, question_type, stem_text, stem_asset_id, options, correct, explanation_rich, difficulty, subject_id, topic_id, source_meta',
    )
    .eq('id', questionId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .maybeSingle();

  return data;
}

function optionTexts(options: unknown): string[] {
  if (!Array.isArray(options)) return [];

  return options.map((option) => {
    const text = (option as { text?: unknown }).text;
    return typeof text === 'string' ? text : '';
  });
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function correctOptionIndex(options: unknown, correct: unknown): number | null {
  const optionId = asRecord(correct).option_id;
  if (typeof optionId !== 'string' || !Array.isArray(options)) return null;
  const index = options.findIndex((option) => (option as { id?: unknown }).id === optionId);
  return index >= 0 ? index : null;
}

export type GenerateQuestionsResult =
  | {
      readonly ok: true;
      readonly requested: number;
      readonly created: number;
      readonly creditsCharged: number;
      readonly balance: number;
    }
  | Failure;

/**
 * Soru üret: writes validated questions as unapproved drafts. Credits are
 * charged per requested question up front (pipeline) and refunded for any
 * question the model returned that failed validation.
 */
export async function generateQuestions(rawInput: unknown): Promise<GenerateQuestionsResult> {
  const parsed = generateQuestionsInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };
  const input = parsed.data;

  const { session, workspace, supabase } = await editorContext();

  let subjectId: string | null = null;
  let topicId: string | null = null;
  let subjectName: string | undefined;
  let outcome: { code: string | null; description: string } | undefined;

  if (input.outcomeId) {
    const { data } = await supabase
      .from('curriculum_outcomes')
      .select('code, description, subject_id, topic_id')
      .eq('id', input.outcomeId)
      .maybeSingle();

    if (!data) return { ok: false, reason: 'outcome_not_found' };
    outcome = { code: data.code, description: data.description };
    subjectId = data.subject_id;
    topicId = data.topic_id;
  }

  if (subjectId) {
    const { data } = await supabase
      .from('curriculum_subjects')
      .select('name')
      .eq('id', subjectId)
      .maybeSingle();
    subjectName = data?.name;
  }

  const credits = AI_CREDIT_COSTS.generate_questions * input.count;
  let result;

  try {
    result = await executeAiJob({
      workspaceId: workspace.id,
      kind: 'generate_questions',
      credits,
      system: loadPromptTemplate('generate_questions.v1.md'),
      prompt: JSON.stringify({
        subject: subjectName,
        grade: input.grade,
        outcome,
        topic: input.topic,
        difficulty: input.difficulty,
        count: input.count,
        questionType: input.questionType,
        optionCount: input.questionType === 'mcq' ? input.optionCount : 0,
        style: input.style,
      }),
      outputSchema: generateQuestionsOutputSchema,
      maxTokens: Math.min(16000, 1500 + TOKENS_PER_GENERATED_QUESTION * input.count),
    });
  } catch (error) {
    return { ok: false, reason: toAiFailureReason(error) };
  }

  const questions = normalizeAiQuestions(
    result.data.questions,
    input.questionType,
    input.count,
  ).filter(
    (question) => input.questionType !== 'mcq' || question.options.length === input.optionCount,
  );

  if (questions.length < input.count) {
    await refundAiCredits(
      supabase,
      workspace.id,
      AI_CREDIT_COSTS.generate_questions * (input.count - questions.length),
      result.jobId,
      'ai_invalid_items',
    );
  }

  if (questions.length === 0) {
    return { ok: false, reason: 'bad_output' };
  }

  const rows = questions.map((question) => ({
    workspace_id: workspace.id,
    created_by: session.userId,
    subject_id: subjectId,
    topic_id: topicId,
    ...buildDraftFields(input.questionType, question),
    source_meta: {
      source: 'ai',
      ai_kind: 'generate_questions',
      ai_job_id: result.jobId,
      ai_model: result.model,
      grade: input.grade,
      ...(input.style ? { style: input.style } : {}),
    },
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('questions')
    .insert(rows)
    .select('id');

  if (insertError || !inserted) {
    return { ok: false, reason: 'save_failed' };
  }

  if (input.outcomeId) {
    await supabase.from('question_outcomes').insert(
      inserted.map((row) => ({
        workspace_id: workspace.id,
        question_id: row.id,
        outcome_id: input.outcomeId as string,
      })),
    );
  }

  return {
    ok: true,
    requested: input.count,
    created: inserted.length,
    creditsCharged: AI_CREDIT_COSTS.generate_questions * inserted.length,
    balance: await creditBalance(supabase, workspace.id),
  };
}

const questionIdSchema = z.object({ questionId: z.uuid() });

export type DraftCreatedResult =
  | {
      readonly ok: true;
      readonly draftId: string;
      readonly creditsCharged: number;
      readonly balance: number;
      readonly hasFigure?: boolean;
      readonly uncertain?: boolean;
    }
  | Failure;

async function downloadAssetForVision(
  supabase: Supabase,
  workspaceId: string,
  assetId: string,
): Promise<{ ok: true; image: AiImageInput } | Failure> {
  const { data: asset } = await supabase
    .from('assets')
    .select('bucket, path, mime')
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!asset) return { ok: false, reason: 'asset_not_found' };

  const mediaType = IMAGE_MEDIA_TYPES[asset.mime];
  if (!mediaType) return { ok: false, reason: 'unsupported_image' };

  const { data: blob, error } = await supabase.storage.from(asset.bucket).download(asset.path);
  if (error || !blob) return { ok: false, reason: 'asset_not_found' };
  if (blob.size > MAX_IMAGE_BYTES) return { ok: false, reason: 'image_too_large' };

  const data = Buffer.from(await blob.arrayBuffer()).toString('base64');
  return { ok: true, image: { mediaType, data } };
}

/**
 * Görselden metne: reads a pasted image question and saves an editable text
 * version as a draft. The original image question is left untouched.
 */
export async function imageToText(rawInput: unknown): Promise<DraftCreatedResult> {
  const parsed = questionIdSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };

  const { session, workspace, supabase } = await editorContext();
  const original = await loadQuestion(supabase, workspace.id, parsed.data.questionId);

  if (!original) return { ok: false, reason: 'question_not_found' };
  if (original.kind !== 'image' || !original.stem_asset_id) {
    return { ok: false, reason: 'not_an_image_question' };
  }

  const image = await downloadAssetForVision(supabase, workspace.id, original.stem_asset_id);
  if (!image.ok) return image;

  let result;

  try {
    result = await executeAiJob({
      workspaceId: workspace.id,
      kind: 'image_to_text',
      system: loadPromptTemplate('image_to_text.v1.md'),
      prompt: JSON.stringify({ task: 'Görseldeki soruyu metne çevir.' }),
      images: [image.image],
      outputSchema: imageToTextOutputSchema,
    });
  } catch (error) {
    return { ok: false, reason: toAiFailureReason(error) };
  }

  const output = result.data;
  const options = output.options
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
  const stem = output.stem.trim();
  if (stem.length === 0) return { ok: false, reason: 'bad_output' };

  const type: AiQuestionType = options.length >= 2 ? 'mcq' : 'open';
  const aiIndex =
    output.correct_index !== null &&
    Number.isInteger(output.correct_index) &&
    output.correct_index >= 0 &&
    output.correct_index < options.length
      ? output.correct_index
      : null;

  // The teacher's own answer key, when the original had one, beats a model reading.
  const originalIndex = correctOptionIndex(original.options, original.correct);
  const keyIndex =
    aiIndex ?? (originalIndex !== null && originalIndex < options.length ? originalIndex : null);

  const normalized: NormalizedAiQuestion = {
    stem,
    options: type === 'mcq' ? options.slice(0, MAX_AI_OPTIONS) : [],
    correctOptionId:
      type === 'mcq' && keyIndex !== null ? (['A', 'B', 'C', 'D', 'E'][keyIndex] ?? null) : null,
    trueFalseValue: null,
    explanation: '',
    difficulty: original.difficulty ?? 3,
  };

  const { data: draft, error: insertError } = await supabase
    .from('questions')
    .insert({
      workspace_id: workspace.id,
      created_by: session.userId,
      subject_id: original.subject_id,
      topic_id: original.topic_id,
      ...buildDraftFields(type, normalized),
      difficulty: original.difficulty,
      source_meta: {
        source: 'ai',
        ai_kind: 'image_to_text',
        ai_job_id: result.jobId,
        ai_model: result.model,
        derived_from: original.id,
        ai_flags: { has_figure: output.has_figure, uncertain: output.uncertain },
      },
    })
    .select('id')
    .single();

  if (insertError || !draft) return { ok: false, reason: 'save_failed' };

  return {
    ok: true,
    draftId: draft.id,
    creditsCharged: result.creditsCharged,
    balance: await creditBalance(supabase, workspace.id),
    hasFigure: output.has_figure,
    uncertain: output.uncertain,
  };
}

const distractorsInputSchema = questionIdSchema.extend({
  count: z
    .number()
    .int()
    .min(1)
    .max(MAX_AI_OPTIONS - 1)
    .default(2),
});

/**
 * Çeldirici üret: saves a draft copy of an mcq question with extra
 * distractors appended. The original question is left untouched.
 */
export async function generateDistractors(rawInput: unknown): Promise<DraftCreatedResult> {
  const parsed = distractorsInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };

  const { session, workspace, supabase } = await editorContext();
  const original = await loadQuestion(supabase, workspace.id, parsed.data.questionId);

  if (!original) return { ok: false, reason: 'question_not_found' };
  if (original.question_type !== 'mcq') return { ok: false, reason: 'not_multiple_choice' };
  if (!original.stem_text) return { ok: false, reason: 'needs_text' };

  const existing = optionTexts(original.options);
  const room = MAX_AI_OPTIONS - existing.length;
  if (room <= 0) return { ok: false, reason: 'options_full' };
  const wanted = Math.min(parsed.data.count, room);

  let result;

  try {
    result = await executeAiJob({
      workspaceId: workspace.id,
      kind: 'generate_distractors',
      system: loadPromptTemplate('generate_distractors.v1.md'),
      prompt: JSON.stringify({
        stem: original.stem_text,
        options: existing,
        correctIndex: correctOptionIndex(original.options, original.correct),
        count: wanted,
      }),
      outputSchema: distractorsOutputSchema,
    });
  } catch (error) {
    return { ok: false, reason: toAiFailureReason(error) };
  }

  const taken = new Set(existing.map((option) => option.trim().toLowerCase()));
  const fresh: string[] = [];

  for (const candidate of result.data.distractors) {
    const text = candidate.trim();
    const key = text.toLowerCase();
    if (text.length === 0 || taken.has(key)) continue;
    taken.add(key);
    fresh.push(text);
    if (fresh.length >= wanted) break;
  }

  if (fresh.length === 0) {
    await refundAiCredits(
      supabase,
      workspace.id,
      result.creditsCharged,
      result.jobId,
      'ai_invalid_items',
    );
    return { ok: false, reason: 'bad_output' };
  }

  const options = buildOptions([...existing, ...fresh]);
  const explanation = richDocToText(
    (original.explanation_rich as Parameters<typeof richDocToText>[0] | null) ?? {
      type: 'doc',
      content: [],
    },
  );

  const { data: draft, error: insertError } = await supabase
    .from('questions')
    .insert({
      workspace_id: workspace.id,
      created_by: session.userId,
      subject_id: original.subject_id,
      topic_id: original.topic_id,
      ...buildDraftFields('mcq', {
        stem: original.stem_text,
        options: [],
        correctOptionId: null,
        trueFalseValue: null,
        explanation,
        difficulty: original.difficulty ?? 3,
      }),
      difficulty: original.difficulty,
      options,
      option_count: options.length,
      correct: original.correct as AnswerKey | null,
      source_meta: {
        source: 'ai',
        ai_kind: 'generate_distractors',
        ai_job_id: result.jobId,
        ai_model: result.model,
        derived_from: original.id,
      },
    })
    .select('id')
    .single();

  if (insertError || !draft) return { ok: false, reason: 'save_failed' };

  return {
    ok: true,
    draftId: draft.id,
    creditsCharged: result.creditsCharged,
    balance: await creditBalance(supabase, workspace.id),
  };
}

export type QualityCheckResult =
  { readonly ok: true; readonly check: StoredQualityCheck; readonly balance: number } | Failure;

/** Kalite kontrolü: stores the warning list on the question (`source_meta.ai_quality`); it never edits the question. */
export async function qualityCheck(rawInput: unknown): Promise<QualityCheckResult> {
  const parsed = questionIdSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };

  const { workspace, supabase } = await editorContext();
  const question = await loadQuestion(supabase, workspace.id, parsed.data.questionId);

  if (!question) return { ok: false, reason: 'question_not_found' };
  if (!question.stem_text) return { ok: false, reason: 'needs_text' };

  const options = optionTexts(question.options);
  const explanation = richDocToText(
    (question.explanation_rich as Parameters<typeof richDocToText>[0] | null) ?? {
      type: 'doc',
      content: [],
    },
  );

  let result;

  try {
    result = await executeAiJob({
      workspaceId: workspace.id,
      kind: 'quality_check',
      system: loadPromptTemplate('quality_check.v1.md'),
      prompt: JSON.stringify({
        type: question.question_type,
        stem: question.stem_text,
        options,
        correctIndex: correctOptionIndex(question.options, question.correct),
        trueFalseValue: asRecord(question.correct).value,
        explanation,
      }),
      outputSchema: qualityCheckOutputSchema,
    });
  } catch (error) {
    return { ok: false, reason: toAiFailureReason(error) };
  }

  const check: StoredQualityCheck = {
    issues: result.data.issues.filter((issue) => issue.message.trim().length > 0),
    difficultyEstimate: Math.min(5, Math.max(1, Math.round(result.data.difficulty_estimate || 3))),
    checkedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('questions')
    .update({ source_meta: { ...asRecord(question.source_meta), ai_quality: check } })
    .eq('id', question.id)
    .eq('workspace_id', workspace.id);

  if (error) return { ok: false, reason: 'save_failed' };

  return { ok: true, check, balance: await creditBalance(supabase, workspace.id) };
}

export interface DraftQuestionRow {
  readonly id: string;
  readonly questionType: AiQuestionType;
  readonly stem: string;
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly correctOptionId: string | null;
  readonly trueFalseValue: boolean | null;
  readonly explanation: string;
  readonly difficulty: number | null;
  readonly createdAt: string;
  readonly aiKind: string | null;
  readonly derivedFrom: string | null;
  readonly flags: { readonly hasFigure: boolean; readonly uncertain: boolean };
  readonly quality: StoredQualityCheck | null;
}

function toDraftRow(row: {
  id: string;
  question_type: string;
  stem_text: string | null;
  options: unknown;
  correct: unknown;
  explanation_rich: unknown;
  difficulty: number | null;
  created_at: string;
  source_meta: unknown;
}): DraftQuestionRow {
  const meta = asRecord(row.source_meta);
  const flags = asRecord(meta.ai_flags);
  const correct = asRecord(row.correct);
  const quality = asRecord(meta.ai_quality);

  return {
    id: row.id,
    questionType: (['mcq', 'tf', 'open'].includes(row.question_type)
      ? row.question_type
      : 'open') as AiQuestionType,
    stem: row.stem_text ?? '',
    options: Array.isArray(row.options)
      ? row.options.map((option) => ({
          id: asString((option as { id?: unknown }).id),
          text: asString((option as { text?: unknown }).text),
        }))
      : [],
    correctOptionId: typeof correct.option_id === 'string' ? correct.option_id : null,
    trueFalseValue: typeof correct.value === 'boolean' ? correct.value : null,
    explanation: row.explanation_rich
      ? richDocToText(row.explanation_rich as Parameters<typeof richDocToText>[0])
      : '',
    difficulty: row.difficulty,
    createdAt: row.created_at,
    aiKind: typeof meta.ai_kind === 'string' ? meta.ai_kind : null,
    derivedFrom: typeof meta.derived_from === 'string' ? meta.derived_from : null,
    flags: { hasFigure: flags.has_figure === true, uncertain: flags.uncertain === true },
    quality: Array.isArray(quality.issues) ? (quality as unknown as StoredQualityCheck) : null,
  };
}

/** İnceleme tepsisi: every unapproved AI draft in the workspace, newest first. */
export async function listDraftQuestions(): Promise<readonly DraftQuestionRow[]> {
  const { workspace, supabase } = await editorContext();

  const { data } = await supabase
    .from('questions')
    .select(
      'id, question_type, stem_text, options, correct, explanation_rich, difficulty, created_at, source_meta',
    )
    .eq('workspace_id', workspace.id)
    .eq('ai_generated', true)
    .eq('ai_review_status', 'draft')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  return (data ?? []).map(toDraftRow);
}

export type SimpleResult = { readonly ok: true } | Failure;

/** Düzenle: replaces the text of a draft. Editing clears its old quality check, which no longer applies. */
export async function updateDraftQuestion(rawInput: unknown): Promise<SimpleResult> {
  const parsed = updateDraftInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };
  const input = parsed.data;

  const { workspace, supabase } = await editorContext();
  const question = await loadQuestion(supabase, workspace.id, input.questionId);
  if (!question) return { ok: false, reason: 'question_not_found' };

  const type = question.question_type as AiQuestionType;
  const options = type === 'mcq' ? buildOptions(input.options) : [];

  if (type === 'mcq') {
    if (options.length < 2) return { ok: false, reason: 'too_few_options' };
    if (input.correctOptionId && !options.some((option) => option.id === input.correctOptionId)) {
      return { ok: false, reason: 'invalid_input' };
    }
  }

  const { ai_quality: _stale, ...meta } = asRecord(question.source_meta);

  const { data, error } = await supabase
    .from('questions')
    .update({
      stem_rich: textToRichDoc(input.stem),
      stem_text: input.stem,
      options,
      option_count: options.length > 0 ? options.length : null,
      correct: buildAnswerKey(type, {
        correctOptionId: input.correctOptionId,
        trueFalseValue: input.trueFalseValue,
        explanation: input.explanation,
      }),
      explanation_rich: input.explanation ? textToRichDoc(input.explanation) : null,
      source_meta: meta,
    })
    .eq('id', input.questionId)
    .eq('workspace_id', workspace.id)
    .eq('ai_review_status', 'draft')
    .select('id');

  if (error || !data || data.length === 0) return { ok: false, reason: 'not_a_draft' };
  return { ok: true };
}

const idsSchema = z.object({ questionIds: z.array(z.uuid()).min(1).max(200) });

/** Sil: removes drafts from the tray (soft delete, drafts only). */
export async function deleteDraftQuestions(
  rawInput: unknown,
): Promise<{ readonly ok: true; readonly deleted: number } | Failure> {
  const parsed = idsSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };

  const { workspace, supabase } = await editorContext();

  const { data, error } = await supabase
    .from('questions')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', parsed.data.questionIds)
    .eq('workspace_id', workspace.id)
    .eq('ai_generated', true)
    .eq('ai_review_status', 'draft')
    .select('id');

  if (error) return { ok: false, reason: 'save_failed' };
  return { ok: true, deleted: data?.length ?? 0 };
}

const approveInputSchema = z.object({ questionId: z.uuid(), render: renderAssetSchema });

/**
 * Onayla: the browser has already rendered the question to a PNG and put it in
 * Storage (same path as a hand written rich question); this registers that
 * asset and flips the draft to approved. A draft that can't be answered
 * (mcq without a marked answer) is refused.
 */
export async function approveDraftQuestion(rawInput: unknown): Promise<SimpleResult> {
  const parsed = approveInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };
  const input = parsed.data;

  const { session, workspace, supabase } = await editorContext();
  const question = await loadQuestion(supabase, workspace.id, input.questionId);
  if (!question) return { ok: false, reason: 'question_not_found' };

  if (!input.render.path.startsWith(`${workspace.id}/`)) {
    return { ok: false, reason: 'path_mismatch' };
  }

  const isMcq = question.question_type === 'mcq';
  const hasAnswer = isMcq
    ? typeof asRecord(question.correct).option_id === 'string'
    : question.question_type === 'tf'
      ? typeof asRecord(question.correct).value === 'boolean'
      : true;

  if (!hasAnswer) {
    await supabase.storage.from('assets').remove([input.render.path]);
    return { ok: false, reason: 'missing_answer' };
  }

  const asset = await chargeRenderAsset(supabase, workspace.id, session.userId, input.render);
  if (!asset.ok) return asset;

  const { data, error } = await supabase
    .from('questions')
    .update({ stem_asset_id: asset.assetId, ai_review_status: 'approved' })
    .eq('id', input.questionId)
    .eq('workspace_id', workspace.id)
    .eq('ai_generated', true)
    .eq('ai_review_status', 'draft')
    .select('id');

  if (error || !data || data.length === 0) return { ok: false, reason: 'not_a_draft' };
  return { ok: true };
}
