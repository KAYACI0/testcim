import type { AnswerKey, EditorItem, TestOp } from './types';

export function sortByPosition(items: readonly EditorItem[]): EditorItem[] {
  return [...items].sort((a, b) =>
    a.position < b.position ? -1 : a.position > b.position ? 1 : 0,
  );
}

/**
 * Pure reducer mirroring `apply_test_ops`'s SQL exactly (supabase/migrations
 * `..._apply_test_ops_quota.sql`), so replaying the same op batch locally
 * and on the server always converges. Used both for the initial optimistic
 * apply and for rebasing onto `missing_ops` after a revision conflict.
 */
export function applyOpsToItems(
  items: readonly EditorItem[],
  ops: readonly TestOp[],
): EditorItem[] {
  let next = [...items];

  for (const op of ops) {
    switch (op.type) {
      case 'add_item': {
        if (next.some((item) => item.id === op.item_id)) {
          continue;
        }
        next = sortByPosition([
          ...next,
          {
            id: op.item_id,
            position: op.position,
            status: 'ready',
            questionId: op.question_id,
            questionRevisionId: op.question_revision_id,
            correct: (op.correct_override as AnswerKey | null | undefined) ?? null,
            points: op.points_override ?? null,
            thumbnailUrl: '',
            sha256: null,
            phash: null,
            duplicateOfItemId: null,
            errorMessage: null,
          },
        ]);
        break;
      }
      case 'remove_item': {
        next = next.filter((item) => item.id !== op.item_id);
        break;
      }
      case 'move_item': {
        next = sortByPosition(
          next.map((item) => (item.id === op.item_id ? { ...item, position: op.position } : item)),
        );
        break;
      }
      case 'set_correct': {
        next = next.map((item) =>
          item.id === op.item_id ? { ...item, correct: op.correct } : item,
        );
        break;
      }
      case 'set_points': {
        next = next.map((item) => (item.id === op.item_id ? { ...item, points: op.points } : item));
        break;
      }
      case 'set_group':
      case 'update_settings':
      case 'update_title':
        // Test-level or grouping ops the strip doesn't render; store.ts
        // handles `update_title`/`update_settings` directly on its own state.
        break;
      default:
        op satisfies never;
    }
  }

  return next;
}
