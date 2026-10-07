import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { bookletAnswer, buildAnswerKeys } from './answer-key';
import { orderBooklet } from './order';
import { item } from './test-helpers';

const choice = (id: string, correctOption: string) =>
  item(id, {
    optionIds: ['a', 'b', 'c', 'd'],
    correct: { question_type: 'mcq', option_id: correctOption },
  });

describe('bookletAnswer', () => {
  it('uses the original letter when options are not shuffled', () => {
    expect(bookletAnswer(choice('i0', 'c'), undefined)).toEqual({
      kind: 'option',
      letter: 'C',
      optionId: 'c',
    });
  });

  it('follows the correct option to its new slot', () => {
    // Slot 0 shows original option 2 (c), slot 1 shows 0 (a), slot 2 shows 3 (d), slot 3 shows 1 (b).
    const permutation = [2, 0, 3, 1];
    expect(bookletAnswer(choice('i0', 'a'), permutation)).toMatchObject({ letter: 'B' });
    expect(bookletAnswer(choice('i0', 'c'), permutation)).toMatchObject({ letter: 'A' });
    expect(bookletAnswer(choice('i0', 'b'), permutation)).toMatchObject({ letter: 'D' });
  });

  it('passes other question types and unknown keys through untouched', () => {
    const trueFalse = item('i0', {
      questionType: 'tf',
      correct: { question_type: 'tf', value: true },
    });
    expect(bookletAnswer(trueFalse, undefined)).toEqual({
      kind: 'raw',
      value: { question_type: 'tf', value: true },
    });
    expect(bookletAnswer(choice('i1', 'zzz'), [0, 1, 2, 3])).toMatchObject({ kind: 'raw' });
  });
});

describe('buildAnswerKeys', () => {
  const items = [choice('i0', 'a'), choice('i1', 'b'), choice('i2', 'c'), choice('i3', 'd')];

  function bundle() {
    const orderings = Object.fromEntries(
      ['A', 'B', 'C'].map((code) => [code, orderBooklet({ items, seed: 21, versionCode: code })]),
    );
    return { orderings, keys: buildAnswerKeys(items, orderings) };
  }

  it('lists every question once per booklet, numbered in printed order', () => {
    const { keys } = bundle();
    for (const entries of Object.values(keys.booklets)) {
      expect(entries.map((entry) => entry.number)).toEqual([1, 2, 3, 4]);
      expect(entries.map((entry) => entry.itemId).sort()).toEqual(['i0', 'i1', 'i2', 'i3']);
    }
  });

  it('maps each question to its number in every version', () => {
    const { orderings, keys } = bundle();
    expect(keys.mapping.map((row) => row.questionId)).toEqual(
      orderings.A?.orderedItemIds.map((id) => `q-${id}`),
    );
    for (const row of keys.mapping) {
      for (const [code, number] of Object.entries(row.byVersion)) {
        const itemId = row.questionId.replace('q-', '');
        expect(orderings[code]?.orderedItemIds.indexOf(itemId)).toBe(number - 1);
      }
    }
  });

  it('keeps the letter in the key pointing at the correct option the student sees', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 }),
        fc.constantFrom('B', 'C', 'D'),
        (seed, code) => {
          const many = Array.from({ length: 12 }, (_, index) =>
            choice(`i${index}`, ['a', 'b', 'c', 'd'][index % 4] as string),
          );
          const ordering = orderBooklet({ items: many, seed, versionCode: code });
          const keys = buildAnswerKeys(many, { [code]: ordering });

          for (const entry of keys.booklets[code] ?? []) {
            const source = many.find((i) => i.id === entry.itemId);
            const permutation = ordering.optionPermutations[entry.itemId];
            if (entry.answer.kind !== 'option' || !source || !permutation) {
              throw new Error('expected a shuffled choice answer');
            }
            const slot = entry.answer.letter.charCodeAt(0) - 'A'.charCodeAt(0);
            // The option shown in the slot the key names is the question's correct option.
            expect(source.optionIds[permutation[slot] as number]).toBe(entry.answer.optionId);
          }
        },
      ),
    );
  });
});
