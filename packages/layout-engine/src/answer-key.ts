import type { BookletOrdering, LayoutItemInput } from './types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** What the key says for one question in one booklet. */
export type BookletAnswer =
  /** A choice question: the letter the student sees for the correct option in this booklet. */
  | { readonly kind: 'option'; readonly letter: string; readonly optionId: string }
  /** Anything else (true/false, fill, numeric, ...): the stored key, untouched. */
  | { readonly kind: 'raw'; readonly value: unknown };

export interface BookletAnswerEntry {
  readonly itemId: string;
  readonly questionId: string;
  /** The number printed in this booklet. */
  readonly number: number;
  readonly answer: BookletAnswer;
}

export interface VersionMappingRow {
  readonly questionId: string;
  /** versionCode -> the number the question has in that booklet. */
  readonly byVersion: Readonly<Record<string, number>>;
}

export interface AnswerKeyBundle {
  /** versionCode -> entries in printed order. */
  readonly booklets: Readonly<Record<string, readonly BookletAnswerEntry[]>>;
  /** One row per question, in the first version's order. */
  readonly mapping: readonly VersionMappingRow[];
}

function isChoiceKey(correct: unknown): correct is { option_id: string } {
  return (
    typeof correct === 'object' &&
    correct !== null &&
    typeof (correct as { option_id?: unknown }).option_id === 'string'
  );
}

/**
 * The answer for one question once its options were shuffled for a booklet. Slot `i`
 * shows original option `permutation[i]`, so the correct option's new letter is the slot
 * that points back at its original index.
 */
export function bookletAnswer(
  item: LayoutItemInput,
  permutation: readonly number[] | undefined,
): BookletAnswer {
  if (item.questionType !== 'mcq' || !isChoiceKey(item.correct)) {
    return { kind: 'raw', value: item.correct };
  }

  const optionId = item.correct.option_id;
  const originalIndex = item.optionIds.indexOf(optionId);
  if (originalIndex < 0) {
    return { kind: 'raw', value: item.correct };
  }

  const slot = permutation ? permutation.indexOf(originalIndex) : originalIndex;
  return { kind: 'option', letter: LETTERS[slot] ?? '?', optionId };
}

/**
 * The answer key for every booklet, plus the table that tells the teacher which number a
 * question has in each version. `orderings` is keyed by version code, in version order.
 */
export function buildAnswerKeys(
  items: readonly LayoutItemInput[],
  orderings: Readonly<Record<string, BookletOrdering>>,
): AnswerKeyBundle {
  const byId = new Map(items.map((item) => [item.id, item]));
  const booklets: Record<string, BookletAnswerEntry[]> = {};
  const numberByVersion = new Map<string, Record<string, number>>();

  for (const [versionCode, ordering] of Object.entries(orderings)) {
    booklets[versionCode] = ordering.orderedItemIds.map((itemId, index) => {
      const item = byId.get(itemId);
      if (!item) throw new Error(`Ordering references an unknown item: ${itemId}`);

      const number = index + 1;
      const perVersion = numberByVersion.get(item.questionId) ?? {};
      perVersion[versionCode] = number;
      numberByVersion.set(item.questionId, perVersion);

      return {
        itemId,
        questionId: item.questionId,
        number,
        answer: bookletAnswer(item, ordering.optionPermutations[itemId]),
      };
    });
  }

  const firstVersion = Object.keys(orderings)[0];
  const firstEntries = firstVersion ? (booklets[firstVersion] ?? []) : [];

  return {
    booklets,
    mapping: firstEntries.map((entry) => ({
      questionId: entry.questionId,
      byVersion: numberByVersion.get(entry.questionId) ?? {},
    })),
  };
}
