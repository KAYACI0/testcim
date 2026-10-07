import type { AnswerKey, TestOp } from '@testcim/shared';

/**
 * Lifecycle of one strip item. A freshly pasted image starts at `pending`
 * and only becomes `ready` once the capture pipeline has uploaded the
 * asset, created its `questions`/`question_revisions` rows, and the
 * resulting `add_item` op has been acknowledged by `apply_test_ops`.
 */
export type ItemStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'error';

export interface EditorItem {
  readonly id: string;
  readonly position: string;
  readonly status: ItemStatus;
  readonly questionId: string | null;
  readonly questionRevisionId: string | null;
  readonly correct: AnswerKey | null;
  readonly points: number | null;
  readonly thumbnailUrl: string;
  readonly sha256: string | null;
  readonly phash: string | null;
  readonly duplicateOfItemId: string | null;
  readonly errorMessage: string | null;
  /** `test_items.group_id`: which passage/group (if any) this item belongs to. */
  readonly groupId: string | null;
  /** The underlying `questions.option_count`, so the answer-key selector shows the right number of letters (A-F). */
  readonly optionCount: number | null;
}

/** One `test_groups` row, as shown in the "assign to group" selector. */
export interface EditorGroup {
  readonly id: string;
  readonly label: string;
}

/**
 * One undo/redo step. `itemIds` is only used to find and upgrade a
 * `local-add` command once its capture pipeline resolves (see
 * `confirmCaptured` in store.ts) — it plays no role in apply/invert.
 */
export interface Command {
  readonly itemIds: readonly string[];
  readonly apply: readonly TestOp[];
  readonly invert: readonly TestOp[];
}

export type { AnswerKey, TestOp };
