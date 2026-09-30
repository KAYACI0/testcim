/**
 * Shared constants for the AI package (Prompt 11). Credit costs and the
 * fast/quality model split live here so both the server pipeline and any
 * future client-side cost preview use the same numbers.
 */

/** One entry per AI feature slice in docs/prompts/11-yapay-zeka-paketi.md § Kapsam. */
export const AI_JOB_KINDS = [
  'generate_questions',
  'image_to_text',
  'generate_distractors',
  'generate_solution',
  'generate_similar',
  'text_to_questions',
  'quality_check',
  'read_answer_key',
  'auto_tag',
  'page_split',
  'nl_command',
  'report_card_summary',
] as const;

export type AiJobKind = (typeof AI_JOB_KINDS)[number];

export type AiModelQuality = 'fast' | 'quality';

/**
 * Credit cost per generated unit (docs/01-analiz-ve-strateji.md § 6). Kinds
 * that produce N items (generate_questions, text_to_questions) are charged
 * `cost * count` by the caller; every other kind is charged once per call.
 */
export const AI_CREDIT_COSTS: Record<AiJobKind, number> = {
  generate_questions: 1,
  image_to_text: 2,
  generate_distractors: 1,
  generate_solution: 1,
  generate_similar: 1,
  text_to_questions: 1,
  quality_check: 1,
  read_answer_key: 1,
  auto_tag: 1,
  page_split: 1,
  nl_command: 1,
  report_card_summary: 1,
};

/**
 * Which model tier each kind uses by default: the strong model for anything
 * that produces or judges question content, the fast/cheap model for OCR-ish
 * reading and tagging (docs/02-mimari.md § 5.5). A pipeline caller may still
 * override this per call.
 */
export const AI_JOB_DEFAULT_QUALITY: Record<AiJobKind, AiModelQuality> = {
  generate_questions: 'quality',
  image_to_text: 'quality',
  generate_distractors: 'quality',
  generate_solution: 'quality',
  generate_similar: 'quality',
  text_to_questions: 'quality',
  quality_check: 'quality',
  read_answer_key: 'fast',
  auto_tag: 'fast',
  page_split: 'fast',
  nl_command: 'quality',
  report_card_summary: 'quality',
};

export const AI_JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed'] as const;
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];
