import { describe, expect, it } from 'vitest';

import type { TestOp } from '@testcim/shared';

import { applyOpsToItems, sortByPosition } from './op-log';

import type { EditorItem } from './types';

function item(overrides: Partial<EditorItem> & { id: string; position: string }): EditorItem {
  return {
    status: 'ready',
    questionId: 'q-' + overrides.id,
    questionRevisionId: 'qr-' + overrides.id,
    correct: null,
    points: null,
    thumbnailUrl: '',
    sha256: null,
    phash: null,
    duplicateOfItemId: null,
    errorMessage: null,
    groupId: null,
    optionCount: null,
    ...overrides,
  };
}

describe('sortByPosition', () => {
  it('sorts lexicographically by the fractional-index position string', () => {
    const items = [
      item({ id: 'c', position: 'a2' }),
      item({ id: 'a', position: 'a0' }),
      item({ id: 'b', position: 'a1' }),
    ];
    expect(sortByPosition(items).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('applyOpsToItems', () => {
  it('inserts a new item at the right sorted position', () => {
    const items = [item({ id: 'a', position: 'a0' }), item({ id: 'c', position: 'a2' })];
    const op: TestOp = {
      type: 'add_item',
      item_id: 'b',
      question_id: 'q-b',
      question_revision_id: 'qr-b',
      position: 'a1',
    };

    const next = applyOpsToItems(items, [op]);
    expect(next.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('ignores an add_item for an id that already exists (idempotent replay)', () => {
    const items = [item({ id: 'a', position: 'a0' })];
    const op: TestOp = {
      type: 'add_item',
      item_id: 'a',
      question_id: 'q-dup',
      question_revision_id: 'qr-dup',
      position: 'a5',
    };

    expect(applyOpsToItems(items, [op])).toEqual(items);
  });

  it('removes an item', () => {
    const items = [item({ id: 'a', position: 'a0' }), item({ id: 'b', position: 'a1' })];
    const next = applyOpsToItems(items, [{ type: 'remove_item', item_id: 'a' }]);
    expect(next.map((i) => i.id)).toEqual(['b']);
  });

  it('moves an item and re-sorts', () => {
    const items = [item({ id: 'a', position: 'a0' }), item({ id: 'b', position: 'a1' })];
    const next = applyOpsToItems(items, [{ type: 'move_item', item_id: 'a', position: 'a2' }]);
    expect(next.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('sets the correct answer and points independently', () => {
    const items = [item({ id: 'a', position: 'a0' })];
    const next = applyOpsToItems(items, [
      { type: 'set_correct', item_id: 'a', correct: { question_type: 'mcq', option_id: 'B' } },
      { type: 'set_points', item_id: 'a', points: 2 },
    ]);

    expect(next[0]?.correct).toEqual({ question_type: 'mcq', option_id: 'B' });
    expect(next[0]?.points).toBe(2);
  });

  it('sets then clears an item group', () => {
    const items = [item({ id: 'a', position: 'a0' })];

    const grouped = applyOpsToItems(items, [{ type: 'set_group', item_id: 'a', group_id: 'g1' }]);
    expect(grouped[0]?.groupId).toBe('g1');

    const ungrouped = applyOpsToItems(grouped, [{ type: 'set_group', item_id: 'a' }]);
    expect(ungrouped[0]?.groupId).toBeNull();
  });

  it('applying a command then its inverse returns to the original state (undo)', () => {
    const items = [
      item({ id: 'a', position: 'a0', correct: { question_type: 'mcq', option_id: 'A' } }),
    ];
    const apply: TestOp[] = [
      { type: 'set_correct', item_id: 'a', correct: { question_type: 'mcq', option_id: 'C' } },
    ];
    const invert: TestOp[] = [
      { type: 'set_correct', item_id: 'a', correct: { question_type: 'mcq', option_id: 'A' } },
    ];

    const afterApply = applyOpsToItems(items, apply);
    const afterInvert = applyOpsToItems(afterApply, invert);

    expect(afterInvert).toEqual(items);
  });

  it('an add_item / remove_item pair round-trips to the original list', () => {
    const items = [item({ id: 'a', position: 'a0' })];
    const addOp: TestOp = {
      type: 'add_item',
      item_id: 'b',
      question_id: 'q-b',
      question_revision_id: 'qr-b',
      position: 'a1',
    };

    const afterAdd = applyOpsToItems(items, [addOp]);
    const afterRemove = applyOpsToItems(afterAdd, [{ type: 'remove_item', item_id: 'b' }]);

    expect(afterRemove).toEqual(items);
  });
});
