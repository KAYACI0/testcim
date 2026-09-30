import type { AnswerKey } from './schemas';

/**
 * Grades one answer against its answer key. Returns `null` for `open`
 * (rubric-based, graded by a teacher) rather than `false`, so callers can
 * tell "answered but ungraded" apart from "wrong" — `attempt_answers.points`
 * stays `null` until a teacher scores it (docs/prompts/09 item 7).
 */
export function scoreAnswer(correct: AnswerKey, given: unknown): boolean | null {
  switch (correct.question_type) {
    case 'mcq':
      return (
        typeof pick(given, 'option_id') === 'string' &&
        pick(given, 'option_id') === correct.option_id
      );
    case 'tf':
      return typeof pick(given, 'value') === 'boolean' && pick(given, 'value') === correct.value;
    case 'fill': {
      const values = pick(given, 'values');
      if (!Array.isArray(values) || values.length !== correct.values.length) return false;
      return correct.values.every(
        (expected, i) => normalizeFillValue(expected) === normalizeFillValue(values[i]),
      );
    }
    case 'match': {
      const pairs = pick(given, 'pairs');
      if (!Array.isArray(pairs) || pairs.length !== correct.pairs.length) return false;
      const expectedSet = new Set(correct.pairs.map((p) => `${p.left}:${p.right}`));
      return pairs.every((p) => isPairLike(p) && expectedSet.has(`${p.left}:${p.right}`));
    }
    case 'open':
      return null;
    case 'numeric': {
      const value = pick(given, 'value');
      if (typeof value !== 'number') return false;
      return Math.abs(value - correct.value) <= correct.tolerance;
    }
    case 'order': {
      const sequence = pick(given, 'sequence');
      if (!Array.isArray(sequence) || sequence.length !== correct.sequence.length) return false;
      return correct.sequence.every((id, i) => id === sequence[i]);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pick(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function isPairLike(value: unknown): value is { left: string; right: string } {
  return isRecord(value) && typeof value.left === 'string' && typeof value.right === 'string';
}

function normalizeFillValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('tr-TR') : '';
}

export interface ScoredItem {
  readonly points: number;
  readonly maxPoints: number;
}

/** Sums an attempt's points, treating ungraded (`null`) open answers as 0 until graded. */
export function totalScore(items: readonly ScoredItem[]): { score: number; maxScore: number } {
  return items.reduce(
    (acc, item) => ({ score: acc.score + item.points, maxScore: acc.maxScore + item.maxPoints }),
    { score: 0, maxScore: 0 },
  );
}
