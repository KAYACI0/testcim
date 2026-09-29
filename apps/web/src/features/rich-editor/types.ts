import type {
  DrawingAttrs,
  DrawingScene,
  EquationAttrs,
  QuestionOptionItem,
  QuestionType,
  RichDoc,
} from '@testcim/shared';

export type { DrawingAttrs, DrawingScene, EquationAttrs, RichDoc };

/**
 * One entry in the question-editor panel's option list (docs/prompts/07 §1).
 * `QuestionOptionItem` (packages/shared) is the persisted shape; this adds
 * the client-only `key` React needs for stable list rendering while the
 * teacher reorders/adds/removes options before saving.
 */
export interface EditableOption extends QuestionOptionItem {
  readonly key: string;
}

/** Draft state the question-editor panel holds before `saveRichQuestion` runs. */
export interface RichQuestionDraft {
  readonly questionType: QuestionType;
  readonly stemRich: RichDoc;
  readonly options: readonly EditableOption[];
  readonly correct: unknown;
  readonly points: number;
  readonly explanationRich: RichDoc | null;
}

export const DRAWING_TOOL_IDS = [
  'select',
  'line',
  'polygon',
  'circle',
  'arc',
  'angle-mark',
  'right-angle-mark',
  'equal-length-mark',
  'point-label',
  'measurement',
  'coordinate-plane',
  'function-graph',
  'arrow',
  'text',
] as const;

export type DrawingToolId = (typeof DRAWING_TOOL_IDS)[number];
