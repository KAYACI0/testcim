import { generateKeyBetween } from 'fractional-indexing';
import { createStore } from 'zustand/vanilla';

import { resolveHeaderSettings, type TestHeaderSettings, type TestSettings } from '@testcim/shared';

import { applyOpsToItems, sortByPosition } from './op-log';

import type { AnswerKey, Command, EditorGroup, EditorItem, TestOp } from './types';

export const DEFAULT_EDITOR_SETTINGS: TestSettings = {
  pageSize: 'a4',
  orientation: 'portrait',
  columns: 2,
  margins: { top: 20, bottom: 20, left: 20, right: 20 },
  columnGap: 10,
  questionGap: 10,
  numberingFormat: 'numeric',
  layoutMode: 'strict',
  fitPagesScaleMin: 0.85,
  header: {
    schoolName: 'Atatürk Ortaokulu',
    title: '',
    subject: 'Matematik',
    className: '8-A',
    teacherName: 'Ad Soyad',
    duration: '40',
    term: '2024-2025 Eğitim-Öğretim Yılı',
    examDate: '',
    instructions: 'Sınav süresi 40 dakikadır. Başarılar dileriz.',
    layoutPreset: 'classic',
    questionSpacing: 'normal',
    showStudentInfo: true,
    showColumnDivider: true,
    showAnswerSheet: false,
    showAnswerKey: false,
    showStudentName: true,
    showStudentNo: true,
    showClass: true,
    showDate: true,
    showScore: true,
    showBookletCode: false,
    bookletCode: 'A',
  },
};

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'error';

export interface ApplyOpsResult {
  readonly ok: boolean;
  readonly current_revision: number;
  readonly missing_ops?: TestOp[];
}

/** Injected so the store stays testable without a real network/server action. */
export interface EditorStoreDeps {
  readonly applyOps: (
    testId: string,
    baseRevision: number,
    ops: TestOp[],
  ) => Promise<ApplyOpsResult>;
  /** Debounce delay before a batch of pending ops is flushed, in ms. */
  readonly flushDelayMs?: number;
}

export interface EditorState {
  readonly testId: string;
  readonly title: string;
  readonly baseRevision: number;
  readonly settings: TestSettings;
  readonly items: readonly EditorItem[];
  readonly groups: readonly EditorGroup[];
  readonly pendingOps: readonly TestOp[];
  readonly undoStack: readonly Command[];
  readonly redoStack: readonly Command[];
  readonly saveStatus: SaveStatus;
  readonly captureMode: boolean;
  readonly selectedItemId: string | null;
  readonly lastAddedItemId: string | null;
  readonly lastAddedAt: number | null;

  setCaptureMode(on: boolean): void;
  select(id: string | null): void;
  positionForNewItem(beforeId: string | null): string;

  addCaptureBatch(placeholders: readonly { id: string; thumbnailUrl: string }[]): void;
  addExternalCapturedItem(captured: {
    readonly id: string;
    readonly position: string;
    readonly questionId: string;
    readonly questionRevisionId: string;
    readonly thumbnailUrl: string;
    readonly correct?: AnswerKey | null;
  }): void;
  updatePipeline(id: string, patch: Partial<EditorItem>): void;
  confirmCaptured(id: string, result: { questionId: string; questionRevisionId: string }): void;
  markCaptureError(id: string, message: string): void;
  cancelCapture(id: string): void;

  removeItem(id: string): void;
  moveItem(id: string, beforeId: string | null, afterId: string | null): void;
  setCorrect(id: string, correct: AnswerKey | null): void;
  setPoints(id: string, points: number | null): void;
  setGroup(id: string, groupId: string | null): void;
  /** Adds (or renames) a group in the local list, e.g. right after `GroupPanel` creates one. */
  upsertGroup(group: EditorGroup): void;
  updateTitle(title: string): void;
  updateSettings(settings: Partial<TestSettings>): void;
  updateHeader(header: Partial<TestHeaderSettings>): void;

  undo(): void;
  redo(): void;

  flush(): Promise<void>;
}

function findItem(items: readonly EditorItem[], id: string): EditorItem | undefined {
  return items.find((item) => item.id === id);
}

export interface EditorHydrateInput {
  readonly testId: string;
  readonly title: string;
  readonly baseRevision: number;
  readonly settings?: TestSettings;
  readonly items: readonly EditorItem[];
  readonly groups?: readonly EditorGroup[];
}

export function createEditorStore(initial: EditorHydrateInput, deps: EditorStoreDeps) {
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  const flushDelayMs = deps.flushDelayMs ?? 800;

  const store = createStore<EditorState>((set, get) => {
    function pushCommand(command: Command) {
      set((state) => ({
        undoStack: [...state.undoStack, command],
        redoStack: [],
      }));
    }

    function dispatch(ops: readonly TestOp[]) {
      set((state) => ({
        items: applyOpsToItems(state.items, ops),
        pendingOps: [...state.pendingOps, ...ops],
      }));
      scheduleFlush();
    }

    function scheduleFlush() {
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
      flushTimer = setTimeout(() => {
        void get().flush();
      }, flushDelayMs);
    }

    return {
      testId: initial.testId,
      title: initial.title,
      baseRevision: initial.baseRevision,
      settings: initial.settings ?? {
        ...DEFAULT_EDITOR_SETTINGS,
        header: resolveHeaderSettings(DEFAULT_EDITOR_SETTINGS.header, initial.title),
      },
      items: sortByPosition(initial.items),
      groups: initial.groups ?? [],
      pendingOps: [],
      undoStack: [],
      redoStack: [],
      saveStatus: 'saved',
      captureMode: false,
      selectedItemId: null,
      lastAddedItemId: null,
      lastAddedAt: null,

      setCaptureMode(on) {
        set({ captureMode: on });
      },

      select(id) {
        set({ selectedItemId: id });
      },

      positionForNewItem(beforeId) {
        const { items } = get();
        if (beforeId === null) {
          return generateKeyBetween(items.at(-1)?.position ?? null, null);
        }
        const index = items.findIndex((item) => item.id === beforeId);
        const before = index > 0 ? items[index - 1] : undefined;
        return generateKeyBetween(before?.position ?? null, items[index]?.position ?? null);
      },

      addCaptureBatch(placeholders) {
        if (placeholders.length === 0) {
          return;
        }

        set((state) => {
          let position = state.items.at(-1)?.position ?? null;
          const newItems: EditorItem[] = placeholders.map((placeholder) => {
            const nextPosition = generateKeyBetween(position, null);
            position = nextPosition;
            return {
              id: placeholder.id,
              position: nextPosition,
              status: 'pending',
              questionId: null,
              questionRevisionId: null,
              correct: null,
              points: null,
              thumbnailUrl: placeholder.thumbnailUrl,
              sha256: null,
              phash: null,
              duplicateOfItemId: null,
              errorMessage: null,
              groupId: null,
              optionCount: null,
            };
          });

          return {
            items: sortByPosition([...state.items, ...newItems]),
            // Empty apply/invert: nothing has been sent to the server yet.
            // `confirmCaptured` upgrades this command in place once the
            // pipeline finishes, so undoing before that just drops the
            // placeholders (see the module doc comment in types.ts).
            undoStack: [
              ...state.undoStack,
              { itemIds: placeholders.map((p) => p.id), apply: [], invert: [] },
            ],
            redoStack: [],
            lastAddedItemId: newItems.at(-1)?.id ?? state.lastAddedItemId,
            lastAddedAt: Date.now(),
          };
        });
      },

      addExternalCapturedItem(captured) {
        set((state) => {
          if (state.items.some((item) => item.id === captured.id)) {
            return state;
          }
          const newItem: EditorItem = {
            id: captured.id,
            position: captured.position,
            status: 'ready',
            questionId: captured.questionId,
            questionRevisionId: captured.questionRevisionId,
            correct: captured.correct ?? null,
            points: null,
            thumbnailUrl: captured.thumbnailUrl,
            sha256: null,
            phash: null,
            duplicateOfItemId: null,
            errorMessage: null,
            groupId: null,
            optionCount: null,
          };
          return {
            items: sortByPosition([...state.items, newItem]),
            selectedItemId: captured.id,
            lastAddedItemId: captured.id,
            lastAddedAt: Date.now(),
          };
        });
      },

      updatePipeline(id, patch) {
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
      },

      confirmCaptured(id, result) {
        const state = get();
        const item = findItem(state.items, id);
        if (!item) {
          // Undone before the pipeline finished; the created question/asset
          // rows are orphaned server-side (acceptable, see docs/backlog.md).
          return;
        }

        const addOp: TestOp = {
          type: 'add_item',
          item_id: id,
          question_id: result.questionId,
          question_revision_id: result.questionRevisionId,
          position: item.position,
        };
        const removeOp: TestOp = { type: 'remove_item', item_id: id };

        set((s) => ({
          items: s.items.map((it) =>
            it.id === id
              ? {
                  ...it,
                  status: 'ready',
                  questionId: result.questionId,
                  questionRevisionId: result.questionRevisionId,
                }
              : it,
          ),
          pendingOps: [...s.pendingOps, addOp],
          undoStack: s.undoStack.map((command) =>
            command.itemIds.includes(id) && command.apply.length === 0
              ? { ...command, apply: [addOp], invert: [removeOp] }
              : command,
          ),
        }));
        scheduleFlush();
      },

      markCaptureError(id, message) {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status: 'error', errorMessage: message } : item,
          ),
        }));
      },

      cancelCapture(id) {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          undoStack: state.undoStack
            .map((command) =>
              command.itemIds.includes(id) && command.apply.length === 0 ? null : command,
            )
            .filter((c): c is Command => c !== null),
        }));
      },

      removeItem(id) {
        const item = findItem(get().items, id);
        if (!item || item.status !== 'ready' || !item.questionId || !item.questionRevisionId) {
          get().cancelCapture(id);
          return;
        }

        const removeOp: TestOp = { type: 'remove_item', item_id: id };
        const restoreOp: TestOp = {
          type: 'add_item',
          item_id: id,
          question_id: item.questionId,
          question_revision_id: item.questionRevisionId,
          position: item.position,
          correct_override: item.correct,
          points_override: item.points ?? undefined,
        };

        pushCommand({ itemIds: [id], apply: [removeOp], invert: [restoreOp] });
        dispatch([removeOp]);
      },

      moveItem(id, beforeId, afterId) {
        const state = get();
        const item = findItem(state.items, id);
        if (!item) {
          return;
        }
        const before = beforeId ? findItem(state.items, beforeId) : undefined;
        const after = afterId ? findItem(state.items, afterId) : undefined;
        const newPosition = generateKeyBetween(before?.position ?? null, after?.position ?? null);

        const applyOp: TestOp = { type: 'move_item', item_id: id, position: newPosition };
        const invertOp: TestOp = { type: 'move_item', item_id: id, position: item.position };

        pushCommand({ itemIds: [id], apply: [applyOp], invert: [invertOp] });
        dispatch([applyOp]);
      },

      setCorrect(id, correct) {
        const item = findItem(get().items, id);
        if (!item) {
          return;
        }
        const applyOp: TestOp = { type: 'set_correct', item_id: id, correct };
        const invertOp: TestOp = { type: 'set_correct', item_id: id, correct: item.correct };

        pushCommand({ itemIds: [id], apply: [applyOp], invert: [invertOp] });
        dispatch([applyOp]);
      },

      setPoints(id, points) {
        const item = findItem(get().items, id);
        if (!item || points === null) {
          return;
        }
        const applyOp: TestOp = { type: 'set_points', item_id: id, points };
        const invertOp: TestOp = { type: 'set_points', item_id: id, points: item.points ?? 1 };

        pushCommand({ itemIds: [id], apply: [applyOp], invert: [invertOp] });
        dispatch([applyOp]);
      },

      setGroup(id, groupId) {
        const item = findItem(get().items, id);
        if (!item) {
          return;
        }
        const applyOp: TestOp = { type: 'set_group', item_id: id, group_id: groupId ?? undefined };
        const invertOp: TestOp = {
          type: 'set_group',
          item_id: id,
          group_id: item.groupId ?? undefined,
        };

        pushCommand({ itemIds: [id], apply: [applyOp], invert: [invertOp] });
        dispatch([applyOp]);
      },

      upsertGroup(group) {
        set((state) => {
          const exists = state.groups.some((g) => g.id === group.id);
          return {
            groups: exists
              ? state.groups.map((g) => (g.id === group.id ? group : g))
              : [...state.groups, group],
          };
        });
      },

      updateTitle(title) {
        const previousTitle = get().title;
        const applyOp: TestOp = { type: 'update_title', title };
        const invertOp: TestOp = { type: 'update_title', title: previousTitle };

        pushCommand({ itemIds: [], apply: [applyOp], invert: [invertOp] });
        set({ title, pendingOps: [...get().pendingOps, applyOp] });
        scheduleFlush();
      },

      updateSettings(patch) {
        const previousSettings = get().settings;
        const nextSettings: TestSettings = { ...previousSettings, ...patch };
        const applyOp: TestOp = { type: 'update_settings', settings: nextSettings };
        const invertOp: TestOp = { type: 'update_settings', settings: previousSettings };

        pushCommand({ itemIds: [], apply: [applyOp], invert: [invertOp] });
        set({ settings: nextSettings, pendingOps: [...get().pendingOps, applyOp] });
        scheduleFlush();
      },

      updateHeader(headerPatch) {
        const previousSettings = get().settings;
        const currentHeader = resolveHeaderSettings(previousSettings.header, get().title);
        const nextHeader = { ...currentHeader, ...headerPatch };
        const nextSettings: TestSettings = { ...previousSettings, header: nextHeader };
        const applyOp: TestOp = { type: 'update_settings', settings: nextSettings };
        const invertOp: TestOp = { type: 'update_settings', settings: previousSettings };

        pushCommand({ itemIds: [], apply: [applyOp], invert: [invertOp] });
        set({ settings: nextSettings, pendingOps: [...get().pendingOps, applyOp] });
        scheduleFlush();
      },

      undo() {
        const state = get();
        const command = state.undoStack.at(-1);
        if (!command) {
          return;
        }
        const remaining = state.undoStack.slice(0, -1);

        if (command.apply.length === 0) {
          // Never synced (still-capturing placeholder): just drop it locally.
          set({
            items: state.items.filter((item) => !command.itemIds.includes(item.id)),
            undoStack: remaining,
            redoStack: [...state.redoStack, command],
          });
          return;
        }

        const titleOp = command.invert.find((op) => op.type === 'update_title');
        const settingsOp = command.invert.find((op) => op.type === 'update_settings');
        set({
          items: applyOpsToItems(state.items, command.invert),
          title: titleOp?.type === 'update_title' ? titleOp.title : state.title,
          settings: settingsOp?.type === 'update_settings' ? settingsOp.settings : state.settings,
          pendingOps: [...state.pendingOps, ...command.invert],
          undoStack: remaining,
          redoStack: [...state.redoStack, command],
        });
        scheduleFlush();
      },

      redo() {
        const state = get();
        const command = state.redoStack.at(-1);
        if (!command) {
          return;
        }
        const remaining = state.redoStack.slice(0, -1);

        if (command.apply.length === 0) {
          // Re-adding a never-synced placeholder isn't meaningful (its bytes
          // are gone); redo for capture batches is a no-op past this point.
          set({ redoStack: remaining });
          return;
        }

        const titleOp = command.apply.find((op) => op.type === 'update_title');
        const settingsOp = command.apply.find((op) => op.type === 'update_settings');
        set({
          items: applyOpsToItems(state.items, command.apply),
          title: titleOp?.type === 'update_title' ? titleOp.title : state.title,
          settings: settingsOp?.type === 'update_settings' ? settingsOp.settings : state.settings,
          pendingOps: [...state.pendingOps, ...command.apply],
          undoStack: [...state.undoStack, command],
          redoStack: remaining,
        });
        scheduleFlush();
      },

      async flush() {
        if (get().saveStatus === 'saving') {
          return;
        }

        set({ saveStatus: 'saving' });

        // Looped rather than recursive: a revision conflict is rebased and
        // retried immediately (the user is already waiting on this save),
        // and the loop also picks up ops queued while the request was in
        // flight, so one flush() call drains everything pending.
        for (;;) {
          const batch = get().pendingOps;
          if (batch.length === 0) {
            set({ saveStatus: 'saved' });
            return;
          }

          try {
            const state = get();
            const result = await deps.applyOps(state.testId, state.baseRevision, [...batch]);

            if (result.ok) {
              set((s) => ({
                baseRevision: result.current_revision,
                pendingOps: s.pendingOps.slice(batch.length),
              }));
              continue;
            }

            // Conflict: another session moved the revision forward. Rebase
            // our still-pending ops onto theirs, then loop to retry. A
            // foreign `update_title` in `missing` is intentionally not
            // merged in: if our own pending batch also renames the test,
            // ours is about to win anyway (last write wins) once resent.
            const missing = result.missing_ops ?? [];
            set((s) => ({
              items: applyOpsToItems(s.items, missing),
              baseRevision: result.current_revision,
            }));
          } catch {
            set({ saveStatus: 'offline' });
            scheduleFlush();
            return;
          }
        }
      },
    };
  });

  return store;
}

export type EditorStore = ReturnType<typeof createEditorStore>;
