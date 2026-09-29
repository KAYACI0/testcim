import { z } from 'zod';

/** Workspace roles, ordered from most to least privileged. */
export const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const roleSchema = z.enum(WORKSPACE_ROLES);

export const uuidSchema = z.uuid();

/**
 * `plans.entitlements` shape. `-1` is the "unlimited" sentinel for the
 * numeric caps (matches the RPCs in supabase/migrations, which skip the
 * usage-limit check when the value is negative or absent).
 */
export const entitlementsSchema = z.object({
  questions_per_test: z.number().int(),
  pdf_exports_per_month: z.number().int(),
  versions_per_test: z.number().int(),
  bank_questions: z.number().int(),
  storage_mb: z.number().int(),
  ai_credits_per_month: z.number().int(),
  omr_scans_per_month: z.number().int(),
  online_participants_per_exam: z.number().int(),
  live_exams_concurrent: z.number().int(),
  advanced_layout: z.enum(['basic', 'full']),
  remove_branding: z.boolean(),
  docx_pptx_export: z.boolean(),
  iframe_embed: z.boolean(),
  seats: z.number().int(),
  api_webhooks: z.boolean(),
});

export type Entitlements = z.infer<typeof entitlementsSchema>;

/** `workspaces.branding` shape. */
export const brandingSchema = z.object({
  logoPath: z.string().optional(),
  schoolName: z.string().optional(),
  headerDefaults: z.record(z.string(), z.unknown()).optional(),
});

export type Branding = z.infer<typeof brandingSchema>;

export const PAGE_SIZES = ['a4', 'letter'] as const;
export const PAGE_ORIENTATIONS = ['portrait', 'landscape'] as const;
export const LAYOUT_MODES = ['strict', 'flexible', 'fit-pages'] as const;
export const NUMBERING_FORMATS = ['numeric', 'alpha'] as const;

/**
 * `tests.settings` shape, consumed by `layout-engine`. Column/question gaps
 * are in millimeters; docs/02 §5.2 requires at least 3mm between questions.
 * `fitPagesScaleMin` is the lower bound for the `fit-pages` layout mode's
 * shrink factor (docs/02 §5.2: 0.85).
 */
export const testSettingsSchema = z.object({
  pageSize: z.enum(PAGE_SIZES).default('a4'),
  orientation: z.enum(PAGE_ORIENTATIONS).default('portrait'),
  columns: z.number().int().min(1).max(3).default(1),
  margins: z.object({
    top: z.number().nonnegative(),
    bottom: z.number().nonnegative(),
    left: z.number().nonnegative(),
    right: z.number().nonnegative(),
  }),
  columnGap: z.number().nonnegative(),
  questionGap: z.number().min(3),
  header: z.string().optional(),
  footer: z.string().optional(),
  numberingFormat: z.enum(NUMBERING_FORMATS).default('numeric'),
  watermark: z.string().optional(),
  pageColor: z.string().optional(),
  layoutMode: z.enum(LAYOUT_MODES).default('strict'),
  fitPagesTarget: z.number().int().positive().optional(),
  fitPagesScaleMin: z.number().min(0.85).max(1).default(0.85),
});

export type TestSettings = z.infer<typeof testSettingsSchema>;

/** One entry in `questions.options` (mcq/match/order question types). */
export const questionOptionItemSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  richText: z.record(z.string(), z.unknown()).optional(),
  imageAssetId: uuidSchema.optional(),
});

export type QuestionOptionItem = z.infer<typeof questionOptionItemSchema>;

export const questionOptionsSchema = z.array(questionOptionItemSchema);

export const QUESTION_TYPES = ['mcq', 'tf', 'fill', 'match', 'open', 'numeric', 'order'] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * `questions.correct` shape, discriminated by `questions.question_type`.
 * A v1 foundation per docs/prompts/01-veritabani.md — the rich editor slice
 * (07) will likely extend these per question type.
 */
export const answerKeySchema = z.discriminatedUnion('question_type', [
  z.object({ question_type: z.literal('mcq'), option_id: z.string() }),
  z.object({ question_type: z.literal('tf'), value: z.boolean() }),
  z.object({ question_type: z.literal('fill'), values: z.array(z.string()) }),
  z.object({
    question_type: z.literal('match'),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  }),
  z.object({ question_type: z.literal('open'), rubric: z.string().optional() }),
  z.object({
    question_type: z.literal('numeric'),
    value: z.number(),
    tolerance: z.number().nonnegative().default(0),
  }),
  z.object({ question_type: z.literal('order'), sequence: z.array(z.string()) }),
]);

export type AnswerKey = z.infer<typeof answerKeySchema>;

/**
 * `apply_test_ops` RPC ops (supabase/migrations `..._tests.sql` and the
 * Prompt 04 quota patch). One client-authored batch = one array of these,
 * sent with a `base_revision` for optimistic concurrency.
 */
export const testOpSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add_item'),
    item_id: uuidSchema,
    question_id: uuidSchema,
    question_revision_id: uuidSchema,
    position: z.string(),
    section_id: uuidSchema.optional(),
    group_id: uuidSchema.optional(),
    points_override: z.number().optional(),
    correct_override: z.unknown().optional(),
    pinned: z.boolean().optional(),
  }),
  z.object({ type: z.literal('remove_item'), item_id: uuidSchema }),
  z.object({
    type: z.literal('move_item'),
    item_id: uuidSchema,
    position: z.string(),
    section_id: uuidSchema.optional(),
  }),
  z.object({
    type: z.literal('set_correct'),
    item_id: uuidSchema,
    correct: answerKeySchema.nullable(),
  }),
  z.object({ type: z.literal('set_points'), item_id: uuidSchema, points: z.number() }),
  z.object({ type: z.literal('set_group'), item_id: uuidSchema, group_id: uuidSchema.optional() }),
  z.object({ type: z.literal('update_settings'), settings: testSettingsSchema }),
  z.object({ type: z.literal('update_title'), title: z.string().min(1) }),
]);

export type TestOp = z.infer<typeof testOpSchema>;

/** One row of `test_items`, as read back from Supabase for the editor. */
export const testItemRowSchema = z.object({
  id: uuidSchema,
  section_id: uuidSchema.nullable(),
  group_id: uuidSchema.nullable(),
  question_id: uuidSchema,
  question_revision_id: uuidSchema,
  position: z.string(),
  points_override: z.number().nullable(),
  correct_override: answerKeySchema.nullable(),
  pinned: z.boolean(),
});

export type TestItemRow = z.infer<typeof testItemRowSchema>;
