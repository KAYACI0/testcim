'use client';

import { useEffect } from 'react';

import { sortByPosition } from './op-log';

import type { EditorStore } from './store';

const LETTER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
const DIGIT_TO_INDEX: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 };
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}

/**
 * Global shortcuts for the editor (docs/prompts/04 §D): Ctrl+Z/Ctrl+Shift+Z
 * for undo/redo, A–E or 1–5 to mark the selected item's correct answer, and
 * Alt+Up/Down to reorder it. All are no-ops while typing in a field.
 */
export function useEditorKeyboard(store: EditorStore) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      const isUndo =
        (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
      const isRedo =
        (event.ctrlKey || event.metaKey) &&
        (event.shiftKey ? event.key.toLowerCase() === 'z' : event.key.toLowerCase() === 'y');

      if (isUndo) {
        event.preventDefault();
        store.getState().undo();
        return;
      }
      if (isRedo) {
        event.preventDefault();
        store.getState().redo();
        return;
      }

      const state = store.getState();
      const selectedId = state.selectedItemId;

      if (
        selectedId &&
        (event.key.toUpperCase() in LETTER_TO_INDEX || event.key in DIGIT_TO_INDEX)
      ) {
        const optionIndex = LETTER_TO_INDEX[event.key.toUpperCase()] ?? DIGIT_TO_INDEX[event.key];
        if (optionIndex !== undefined) {
          event.preventDefault();
          state.setCorrect(selectedId, { question_type: 'mcq', option_id: LETTERS[optionIndex]! });
        }
        return;
      }

      if (selectedId && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        const sorted = sortByPosition(state.items);
        const index = sorted.findIndex((item) => item.id === selectedId);
        if (index === -1) {
          return;
        }

        if (event.key === 'ArrowUp' && index > 0) {
          const target = sorted[index - 1]!;
          const before = index - 2 >= 0 ? sorted[index - 2]!.id : null;
          state.moveItem(selectedId, before, target.id);
        } else if (event.key === 'ArrowDown' && index < sorted.length - 1) {
          const target = sorted[index + 1]!;
          const after = index + 2 < sorted.length ? sorted[index + 2]!.id : null;
          state.moveItem(selectedId, target.id, after);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [store]);
}
