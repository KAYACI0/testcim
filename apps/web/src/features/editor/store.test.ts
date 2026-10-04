import { describe, expect, it, vi } from 'vitest';

import { createEditorStore, type ApplyOpsResult } from './store';

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
    ...overrides,
  };
}

function okResult(revision: number): ApplyOpsResult {
  return { ok: true, current_revision: revision };
}

describe('editor store: capture placeholders', () => {
  it('adds a pending placeholder, then confirms it into a synced ready item', async () => {
    const applyOps = vi.fn().mockResolvedValue(okResult(2));
    const store = createEditorStore(
      { testId: 't1', title: 'Test', baseRevision: 1, items: [] },
      { applyOps, flushDelayMs: 100_000 },
    );

    store.getState().addCaptureBatch([{ id: 'a', thumbnailUrl: 'blob:a' }]);
    expect(store.getState().items[0]?.status).toBe('pending');
    expect(store.getState().pendingOps).toEqual([]);

    store.getState().confirmCaptured('a', { questionId: 'q-a', questionRevisionId: 'qr-a' });
    expect(store.getState().items[0]?.status).toBe('ready');
    expect(store.getState().pendingOps).toHaveLength(1);

    await store.getState().flush();
    expect(applyOps).toHaveBeenCalledWith('t1', 1, [
      expect.objectContaining({ type: 'add_item', item_id: 'a' }),
    ]);
    expect(store.getState().baseRevision).toBe(2);
    expect(store.getState().pendingOps).toEqual([]);
    expect(store.getState().saveStatus).toBe('saved');
  });

  it('undoing a placeholder before it syncs just drops it, with no server call', () => {
    const applyOps = vi.fn();
    const store = createEditorStore(
      { testId: 't1', title: 'Test', baseRevision: 1, items: [] },
      { applyOps, flushDelayMs: 100_000 },
    );

    store.getState().addCaptureBatch([{ id: 'a', thumbnailUrl: 'blob:a' }]);
    store.getState().undo();

    expect(store.getState().items).toEqual([]);
    expect(applyOps).not.toHaveBeenCalled();
  });

  it('a capture batch of several images is a single undo step', () => {
    const store = createEditorStore(
      { testId: 't1', title: 'Test', baseRevision: 1, items: [] },
      { applyOps: vi.fn(), flushDelayMs: 100_000 },
    );

    store.getState().addCaptureBatch([
      { id: 'a', thumbnailUrl: 'blob:a' },
      { id: 'b', thumbnailUrl: 'blob:b' },
    ]);
    expect(store.getState().items).toHaveLength(2);

    store.getState().undo();
    expect(store.getState().items).toHaveLength(0);
  });
});

describe('editor store: synced item edits', () => {
  it('undo/redo round-trips a set_correct edit', () => {
    const store = createEditorStore(
      {
        testId: 't1',
        title: 'Test',
        baseRevision: 1,
        items: [item({ id: 'a', position: 'a0' })],
      },
      { applyOps: vi.fn().mockResolvedValue(okResult(2)), flushDelayMs: 100_000 },
    );

    store.getState().setCorrect('a', { question_type: 'mcq', option_id: 'B' });
    expect(store.getState().items[0]?.correct).toEqual({ question_type: 'mcq', option_id: 'B' });

    store.getState().undo();
    expect(store.getState().items[0]?.correct).toBeNull();

    store.getState().redo();
    expect(store.getState().items[0]?.correct).toEqual({ question_type: 'mcq', option_id: 'B' });
  });

  it('removeItem then undo restores the item at its original position', () => {
    const store = createEditorStore(
      {
        testId: 't1',
        title: 'Test',
        baseRevision: 1,
        items: [item({ id: 'a', position: 'a0' }), item({ id: 'b', position: 'a1' })],
      },
      { applyOps: vi.fn().mockResolvedValue(okResult(2)), flushDelayMs: 100_000 },
    );

    store.getState().removeItem('a');
    expect(store.getState().items.map((i) => i.id)).toEqual(['b']);

    store.getState().undo();
    expect(store.getState().items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('updates header and settings with undo and redo support', () => {
    const store = createEditorStore(
      {
        testId: 't1',
        title: 'Original Title',
        baseRevision: 1,
        items: [],
      },
      { applyOps: vi.fn().mockResolvedValue(okResult(2)), flushDelayMs: 100_000 },
    );

    expect(store.getState().settings.columns).toBe(1);

    store.getState().updateHeader({ schoolName: 'Test School', showStudentName: true });
    expect(store.getState().settings.header).toMatchObject({
      schoolName: 'Test School',
      showStudentName: true,
    });
    expect(store.getState().pendingOps).toHaveLength(1);

    store.getState().updateSettings({ columns: 2 });
    expect(store.getState().settings.columns).toBe(2);
    expect(store.getState().pendingOps).toHaveLength(2);

    store.getState().undo();
    expect(store.getState().settings.columns).toBe(1);

    store.getState().undo();
    expect(store.getState().settings.header).not.toMatchObject({ schoolName: 'Test School' });

    store.getState().redo();
    expect(store.getState().settings.header).toMatchObject({ schoolName: 'Test School' });
  });
});

describe('editor store: sync', () => {
  it('rebases pending ops onto missing_ops on a revision conflict, then retries', async () => {
    const applyOps = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        current_revision: 5,
        missing_ops: [{ type: 'update_title', title: 'Renamed elsewhere' }],
      })
      .mockResolvedValueOnce(okResult(6));

    const store = createEditorStore(
      { testId: 't1', title: 'Original', baseRevision: 1, items: [] },
      { applyOps, flushDelayMs: 100_000 },
    );

    store.getState().updateTitle('My title');
    // A single flush() call drains the whole retry loop: conflict, rebase,
    // then an immediate retry against the new revision — no second call needed.
    await store.getState().flush();

    expect(applyOps).toHaveBeenCalledTimes(2);
    expect(applyOps).toHaveBeenLastCalledWith('t1', 5, [
      expect.objectContaining({ type: 'update_title', title: 'My title' }),
    ]);
    expect(store.getState().title).toBe('My title');
    expect(store.getState().baseRevision).toBe(6);
    expect(store.getState().saveStatus).toBe('saved');
  });

  it('marks the store offline on a network failure and keeps the ops pending', async () => {
    const applyOps = vi.fn().mockRejectedValue(new Error('network down'));
    const store = createEditorStore(
      { testId: 't1', title: 'Test', baseRevision: 1, items: [item({ id: 'a', position: 'a0' })] },
      { applyOps, flushDelayMs: 100_000 },
    );

    store.getState().setCorrect('a', { question_type: 'mcq', option_id: 'A' });
    await store.getState().flush();

    expect(store.getState().saveStatus).toBe('offline');
    expect(store.getState().pendingOps).toHaveLength(1);
  });
});
