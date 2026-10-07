import { z } from 'zod';

import type { RichDoc } from './schemas';

/**
 * Schemas and helpers for the Prompt 11 question features (generate, image to
 * text, distractors, quality check). Provider output is validated against the
 * `*OutputSchema` values below; the action inputs use the `*InputSchema`
 * values. Output schemas stay free of min/max constraints on purpose: the
 * structured-output JSON schema supports few of them, so bounds are enforced
 * in code after parsing (`clampAiQuestions`).
 */

export const AI_QUESTION_TYPES = ['mcq', 'tf', 'open'] as const;
export type AiQuestionType = (typeof AI_QUESTION_TYPES)[number];

export const MAX_AI_QUESTIONS_PER_CALL = 10;
export const MAX_AI_OPTIONS = 5;
export const MIN_AI_OPTIONS = 2;

export const aiQuestionDraftSchema = z.object({
  stem: z.string(),
  /** Plain option texts without a letter prefix; empty for true/false and open questions. */
  options: z.array(z.string()),
  /** Zero-based index of the correct option; for true/false 0 means true. Null for open questions. */
  correct_index: z.number().nullable(),
  explanation: z.string(),
  difficulty: z.number(),
});

export type AiQuestionDraft = z.infer<typeof aiQuestionDraftSchema>;

export const generateQuestionsOutputSchema = z.object({
  questions: z.array(aiQuestionDraftSchema),
});

export const imageToTextOutputSchema = z.object({
  stem: z.string(),
  options: z.array(z.string()),
  correct_index: z.number().nullable(),
  /** True when the question depends on a figure or graph that text cannot carry. */
  has_figure: z.boolean(),
  /** True when part of the image was unreadable and the text is a best guess. */
  uncertain: z.boolean(),
});

export type ImageToTextOutput = z.infer<typeof imageToTextOutputSchema>;

export const distractorsOutputSchema = z.object({
  distractors: z.array(z.string()),
});

export const QUALITY_ISSUE_KINDS = [
  'ambiguity',
  'multiple_correct',
  'no_correct',
  'typo',
  'answer_mismatch',
  'other',
] as const;

export const QUALITY_SEVERITIES = ['info', 'warn', 'error'] as const;

export const qualityIssueSchema = z.object({
  kind: z.enum(QUALITY_ISSUE_KINDS),
  severity: z.enum(QUALITY_SEVERITIES),
  message: z.string(),
});

export type QualityIssue = z.infer<typeof qualityIssueSchema>;

export const qualityCheckOutputSchema = z.object({
  issues: z.array(qualityIssueSchema),
  /** Estimated difficulty on the bank's 1 to 5 scale. */
  difficulty_estimate: z.number(),
});

export type QualityCheckOutput = z.infer<typeof qualityCheckOutputSchema>;

/** Stored under `questions.source_meta.ai_quality` after a quality check. */
export interface StoredQualityCheck {
  readonly issues: readonly QualityIssue[];
  readonly difficultyEstimate: number;
  readonly checkedAt: string;
}

export const generateQuestionsInputSchema = z
  .object({
    outcomeId: z.uuid().optional(),
    topic: z.string().trim().max(200).optional(),
    grade: z.number().int().min(1).max(12),
    difficulty: z.number().int().min(1).max(5),
    count: z.number().int().min(1).max(MAX_AI_QUESTIONS_PER_CALL),
    questionType: z.enum(AI_QUESTION_TYPES),
    optionCount: z.number().int().min(MIN_AI_OPTIONS).max(MAX_AI_OPTIONS).default(4),
    style: z.string().trim().max(120).optional(),
  })
  .refine((input) => input.outcomeId !== undefined || Boolean(input.topic), {
    message: 'outcome_or_topic_required',
  });

export type GenerateQuestionsInput = z.infer<typeof generateQuestionsInputSchema>;

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function clampDifficulty(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export interface NormalizedAiQuestion {
  readonly stem: string;
  readonly options: readonly string[];
  /** Letter id of the correct option for mcq, null otherwise. */
  readonly correctOptionId: string | null;
  /** Truth value for true/false questions, null otherwise. */
  readonly trueFalseValue: boolean | null;
  readonly explanation: string;
  readonly difficulty: number;
}

/**
 * Enforces the bounds the structured-output schema can't express and drops
 * items that can't be a valid question of the requested type (empty stem,
 * too few or too many options, an out-of-range correct index). The caller
 * charges credits for the requested count and only stores what survives.
 */
export function normalizeAiQuestions(
  drafts: readonly AiQuestionDraft[],
  questionType: AiQuestionType,
  maxCount: number,
): NormalizedAiQuestion[] {
  const result: NormalizedAiQuestion[] = [];

  for (const draft of drafts) {
    if (result.length >= maxCount) break;

    const stem = draft.stem.trim();
    if (stem.length === 0) continue;

    const explanation = draft.explanation.trim();
    const difficulty = clampDifficulty(draft.difficulty);

    if (questionType === 'open') {
      result.push({
        stem,
        options: [],
        correctOptionId: null,
        trueFalseValue: null,
        explanation,
        difficulty,
      });
      continue;
    }

    if (questionType === 'tf') {
      if (draft.correct_index !== 0 && draft.correct_index !== 1) continue;
      result.push({
        stem,
        options: [],
        correctOptionId: null,
        trueFalseValue: draft.correct_index === 0,
        explanation,
        difficulty,
      });
      continue;
    }

    const options = draft.options.map((option) => option.trim()).filter((o) => o.length > 0);
    if (options.length < MIN_AI_OPTIONS || options.length > MAX_AI_OPTIONS) continue;
    if (new Set(options).size !== options.length) continue;

    const index = draft.correct_index;
    if (index === null || !Number.isInteger(index) || index < 0 || index >= options.length) {
      continue;
    }

    result.push({
      stem,
      options,
      correctOptionId: OPTION_LETTERS[index] ?? null,
      trueFalseValue: null,
      explanation,
      difficulty,
    });
  }

  return result;
}

interface InlineNode {
  readonly type: 'text' | 'equation';
  readonly text?: string;
  readonly attrs?: { readonly latex: string };
}

/** Splits one line into text and `$latex$` equation nodes; an unmatched `$` stays literal text. */
function lineToInline(line: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (buffer.length > 0) {
      nodes.push({ type: 'text', text: buffer });
      buffer = '';
    }
  };

  while (index < line.length) {
    const char = line[index] as string;

    if (char === '\\' && line[index + 1] === '$') {
      buffer += '$';
      index += 2;
      continue;
    }

    if (char === '$') {
      let close = index + 1;
      while (close < line.length && !(line[close] === '$' && line[close - 1] !== '\\')) {
        close += 1;
      }
      const latex = close < line.length ? line.slice(index + 1, close).trim() : '';

      if (latex.length > 0 && latex.length <= 4000) {
        flush();
        nodes.push({ type: 'equation', attrs: { latex } });
        index = close + 1;
        continue;
      }
    }

    buffer += char;
    index += 1;
  }

  flush();
  return nodes;
}

/**
 * Converts AI plain text (blank-line separated paragraphs, `$...$` for LaTeX)
 * into the TipTap-shaped `RichDoc` the editor and renderer already use.
 */
export function textToRichDoc(text: string): RichDoc {
  const paragraphs = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const content =
    paragraphs.length === 0
      ? [{ type: 'paragraph' }]
      : paragraphs.map((line) => ({ type: 'paragraph', content: lineToInline(line) }));

  return { type: 'doc', content };
}

interface PlainNode {
  readonly type?: string;
  readonly text?: string;
  readonly attrs?: Record<string, unknown>;
  readonly content?: readonly PlainNode[];
}

function nodeToText(node: PlainNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'equation') {
    const latex = typeof node.attrs?.latex === 'string' ? node.attrs.latex : '';
    return latex.length > 0 ? `$${latex}$` : '';
  }
  if (node.type === 'hardBreak') return '\n';

  const inner = (node.content ?? []).map(nodeToText).join('');
  return node.type === 'paragraph' ? `${inner}\n` : inner;
}

/** Plain-text form of a `RichDoc` for `questions.stem_text` (search and shuffling); equations keep their `$latex$` source. */
export function richDocToText(doc: RichDoc): string {
  return (doc.content as readonly PlainNode[])
    .map(nodeToText)
    .join('')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** What an AI-edited draft is allowed to change in the review tray. */
export const updateDraftInputSchema = z.object({
  questionId: z.uuid(),
  stem: z.string().trim().min(1).max(8000),
  options: z.array(z.string().trim().min(1).max(2000)).max(MAX_AI_OPTIONS),
  correctOptionId: z.enum(OPTION_LETTERS).nullable(),
  trueFalseValue: z.boolean().nullable(),
  explanation: z.string().trim().max(8000),
});

export type UpdateDraftInput = z.infer<typeof updateDraftInputSchema>;
