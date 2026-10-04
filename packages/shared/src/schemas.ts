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

export const testHeaderSettingsSchema = z.object({
  schoolName: z.string().optional().default(''),
  title: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  term: z.string().optional().default(''),
  examDate: z.string().optional().default(''),
  instructions: z.string().optional().default(''),
  showStudentName: z.boolean().optional().default(true),
  showStudentNo: z.boolean().optional().default(true),
  showClass: z.boolean().optional().default(true),
  showDate: z.boolean().optional().default(true),
  showScore: z.boolean().optional().default(true),
  showBookletCode: z.boolean().optional().default(false),
  bookletCode: z.string().optional().default('A'),
});

export type TestHeaderSettings = z.infer<typeof testHeaderSettingsSchema>;

export function resolveHeaderSettings(
  header: unknown,
  fallbackTitle: string = '',
): TestHeaderSettings {
  const defaults: TestHeaderSettings = {
    schoolName: '',
    title: fallbackTitle,
    subject: '',
    term: '',
    examDate: '',
    instructions: '',
    showStudentName: true,
    showStudentNo: true,
    showClass: true,
    showDate: true,
    showScore: true,
    showBookletCode: false,
    bookletCode: 'A',
  };

  if (!header) {
    return defaults;
  }

  if (typeof header === 'string') {
    try {
      const parsed: unknown = JSON.parse(header);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...defaults, ...(parsed as Record<string, unknown>) };
      }
    } catch {
      return { ...defaults, schoolName: header };
    }
  }

  if (typeof header === 'object') {
    return { ...defaults, ...(header as Record<string, unknown>) };
  }

  return defaults;
}

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
  header: z.union([z.string(), testHeaderSettingsSchema]).optional(),
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
  z.object({
    type: z.literal('add_group'),
    group_id: uuidSchema,
    passage_rich: z.unknown().optional(),
    passage_asset_id: uuidSchema.optional(),
  }),
  z.object({
    type: z.literal('update_group'),
    group_id: uuidSchema,
    passage_rich: z.unknown().optional(),
    passage_asset_id: uuidSchema.optional(),
  }),
  z.object({ type: z.literal('update_settings'), settings: testSettingsSchema }),
  z.object({ type: z.literal('update_title'), title: z.string().min(1) }),
  /** Moves an unpinned item onto its question's current revision (Prompt 08). */
  z.object({ type: z.literal('upgrade_revision'), item_id: uuidSchema }),
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

/**
 * `questions.stem_rich` / `options[].richText` / `explanation_rich` /
 * `test_groups.passage_rich` shape (Prompt 07). These are TipTap
 * (ProseMirror) documents: deeply validating every node/mark with Zod would
 * duplicate ProseMirror's own schema and drift from it on every TipTap
 * upgrade, so this only checks the outer envelope (`{type: 'doc', content}`)
 * and a byte-size ceiling. TipTap's own schema is the source of truth for
 * node/mark shape; the equation and drawing node `attrs` below are the only
 * parts Testcim code reads directly, so those get their own strict schemas.
 */
export const RICH_DOC_MAX_BYTES = 200_000;

export const richDocSchema = z
  .object({ type: z.literal('doc'), content: z.array(z.unknown()) })
  .loose()
  .refine((doc) => JSON.stringify(doc).length <= RICH_DOC_MAX_BYTES, {
    message: `rich document exceeds ${RICH_DOC_MAX_BYTES} bytes`,
  });

export type RichDoc = z.infer<typeof richDocSchema>;

/** Attrs of the TipTap `equation` node (inline atom): LaTeX source + a11y text. */
export const equationAttrsSchema = z.object({
  latex: z.string().min(1).max(4000),
  altText: z.string().max(500).optional(),
});

export type EquationAttrs = z.infer<typeof equationAttrsSchema>;

/**
 * One shape in a `drawing` node's Konva scene. Deliberately loose (`z.unknown()`
 * for tool-specific fields) since each tool (line, polygon, circle, arc,
 * angle-mark, ...) has its own attribute set; `drawing/serialize.ts` in
 * `apps/web` owns the authoritative per-tool shape and this only guards the
 * envelope every object shares.
 */
export const drawingSceneObjectSchema = z.object({ id: z.string(), tool: z.string() }).loose();

export const drawingSceneSchema = z.object({
  version: z.number().int().positive().default(1),
  width: z.number().positive(),
  height: z.number().positive(),
  objects: z.array(drawingSceneObjectSchema),
});

export type DrawingScene = z.infer<typeof drawingSceneSchema>;

/** Attrs of the TipTap `drawing` node (block atom): editable scene + its SVG render + a11y text. */
export const drawingAttrsSchema = z.object({
  scene: drawingSceneSchema,
  svg: z.string().min(1),
  altText: z.string().max(500).optional(),
});

export type DrawingAttrs = z.infer<typeof drawingAttrsSchema>;

/**
 * Prompt 08 (soru bankası ve müfredat): curriculum tables are tenant-less
 * system data (docs/02 §6), read-only to clients, written only by
 * `scripts/curriculum/import.ts`.
 */
export const curriculumSubjectSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  grade_from: z.number().int().nullable(),
  grade_to: z.number().int().nullable(),
});

export type CurriculumSubject = z.infer<typeof curriculumSubjectSchema>;

export const curriculumTopicSchema = z.object({
  id: uuidSchema,
  subject_id: uuidSchema,
  parent_id: uuidSchema.nullable(),
  name: z.string(),
});

export type CurriculumTopic = z.infer<typeof curriculumTopicSchema>;

export const curriculumOutcomeSchema = z.object({
  id: uuidSchema,
  subject_id: uuidSchema,
  topic_id: uuidSchema.nullable(),
  grade: z.number().int().nullable(),
  code: z.string().nullable(),
  description: z.string(),
});

export type CurriculumOutcome = z.infer<typeof curriculumOutcomeSchema>;

/** `/bank` filter bar state (docs/prompts/08 item 2): one row, all optional. */
export const bankFilterSchema = z.object({
  folderId: uuidSchema.nullable().optional(),
  search: z.string().max(200).optional(),
  subjectId: uuidSchema.optional(),
  topicId: uuidSchema.optional(),
  outcomeId: uuidSchema.optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  questionType: z.enum(QUESTION_TYPES).optional(),
  tagIds: z.array(uuidSchema).optional(),
  createdBy: uuidSchema.optional(),
  aiStatus: z.enum(['draft', 'approved']).optional(),
  createdFrom: z.iso.date().optional(),
  createdTo: z.iso.date().optional(),
});

export type BankFilter = z.infer<typeof bankFilterSchema>;

export const bulkTagInputSchema = z.object({
  questionIds: z.array(uuidSchema).min(1).max(500),
  tagIds: z.array(uuidSchema).min(1),
});

export type BulkTagInput = z.infer<typeof bulkTagInputSchema>;

/**
 * `docs/prompts/12` roster import: one validated row, after the client's
 * column-mapping step resolved which spreadsheet column is which. KVKK
 * binding rule — never add fields beyond number + full name.
 */
export const rosterImportRowSchema = z.object({
  studentNo: z.string().trim().max(50).optional(),
  fullName: z.string().trim().min(1).max(200),
});

export type RosterImportRow = z.infer<typeof rosterImportRowSchema>;

export const MAX_ROSTER_IMPORT_ROWS = 300;

export const rosterImportInputSchema = z.object({
  classId: uuidSchema,
  rows: z.array(rosterImportRowSchema).min(1).max(MAX_ROSTER_IMPORT_ROWS),
});

export type RosterImportInput = z.infer<typeof rosterImportInputSchema>;

/**
 * `docs/prompts/12` result linking: bulk-attach exam_attempts/omr_scans rows
 * to student records via `link_attempts_to_students`.
 */
export const resultLinkSchema = z.object({
  kind: z.enum(['exam_attempt', 'omr_scan']),
  id: uuidSchema,
  studentId: uuidSchema,
});

export type ResultLink = z.infer<typeof resultLinkSchema>;

export const MAX_RESULT_LINKS = 300;

export const linkResultsInputSchema = z.object({
  links: z.array(resultLinkSchema).min(1).max(MAX_RESULT_LINKS),
});

export type LinkResultsInput = z.infer<typeof linkResultsInputSchema>;

/**
 * `docs/prompts/12` PR5 report RPC outputs. Only `exam_attempts`/
 * `attempt_answers` are aggregated — OMR results need a position→question_id
 * mapping that isn't built yet (see the migration's scope note).
 */
export const classReportSchema = z.object({
  student_count: z.number().int().min(0),
  attempt_count: z.number().int().min(0),
  average_percent: z.number().nullable(),
  score_distribution: z.array(z.object({ student_id: uuidSchema, percent: z.number() })),
  hardest_questions: z.array(
    z.object({
      item_id: uuidSchema,
      question_id: uuidSchema,
      stem_preview: z.string(),
      correct_rate_percent: z.number(),
    }),
  ),
});

export type ClassReport = z.infer<typeof classReportSchema>;

export const outcomeReportRowSchema = z.object({
  outcome_id: uuidSchema,
  description: z.string(),
  correct_count: z.number().int().min(0),
  total_count: z.number().int().min(0),
  correct_rate_percent: z.number(),
});

export const outcomeReportSchema = z.array(outcomeReportRowSchema);

export type OutcomeReportRow = z.infer<typeof outcomeReportRowSchema>;

export const studentProgressRowSchema = z.object({
  exam_title: z.string(),
  score: z.number(),
  max_score: z.number(),
  submitted_at: z.string(),
});

export const studentProgressSchema = z.array(studentProgressRowSchema);

export type StudentProgressRow = z.infer<typeof studentProgressRowSchema>;

export const weakTopicRowSchema = z.object({
  topic_id: uuidSchema,
  name: z.string(),
  correct_count: z.number().int().min(0),
  total_count: z.number().int().min(0),
  correct_rate_percent: z.number(),
});

export const weakTopicsSchema = z.array(weakTopicRowSchema);

export type WeakTopicRow = z.infer<typeof weakTopicRowSchema>;
