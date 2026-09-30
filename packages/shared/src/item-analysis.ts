/**
 * Classical test theory item statistics (docs/prompts/09 item 8). Pure
 * functions over per-attempt score vectors so they're unit-testable against
 * known textbook examples without a database.
 */

export interface AttemptItemScore {
  readonly attemptId: string;
  /** 1 = correct/full credit, 0 = incorrect, fraction for partial credit. */
  readonly correctness: number;
}

/** Difficulty index: mean correctness across all attempts (0 = hardest, 1 = easiest). */
export function difficultyP(scores: readonly AttemptItemScore[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s.correctness, 0) / scores.length;
}

/**
 * Discrimination index: correctness rate of the top 27% (by total test score)
 * minus the bottom 27%. `totalScoreByAttemptId` ranks attempts; ties keep
 * their relative order (stable sort).
 */
export function discriminationIndex(
  itemScores: readonly AttemptItemScore[],
  totalScoreByAttemptId: ReadonlyMap<string, number>,
): number | null {
  if (itemScores.length < 4) return null;

  const ranked = [...itemScores].sort(
    (a, b) =>
      (totalScoreByAttemptId.get(b.attemptId) ?? 0) - (totalScoreByAttemptId.get(a.attemptId) ?? 0),
  );
  const groupSize = Math.max(1, Math.round(ranked.length * 0.27));
  const top = ranked.slice(0, groupSize);
  const bottom = ranked.slice(-groupSize);

  const mean = (group: readonly AttemptItemScore[]) =>
    group.reduce((sum, s) => sum + s.correctness, 0) / group.length;

  return mean(top) - mean(bottom);
}

/** Share of respondents who picked each option (mcq/tf çeldirici dağılımı). */
export function optionDistribution(
  chosenOptionIds: readonly (string | null)[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const id of chosenOptionIds) {
    const key = id ?? '__blank__';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = chosenOptionIds.length || 1;
  return new Map([...counts].map(([id, count]) => [id, count / total]));
}

/**
 * KR-20 (Kuder-Richardson Formula 20) internal-consistency reliability for a
 * test made of dichotomously-scored items. `itemCorrectnessByAttempt[i]` is
 * one item's correctness (0/1) across attempts, all the same length/order.
 */
export function kr20(itemCorrectnessByAttempt: readonly (readonly number[])[]): number | null {
  const k = itemCorrectnessByAttempt.length;
  if (k < 2) return null;
  const n = itemCorrectnessByAttempt[0]?.length ?? 0;
  if (n < 2) return null;

  const pValues = itemCorrectnessByAttempt.map((item) => item.reduce((a, b) => a + b, 0) / n);
  const sumPQ = pValues.reduce((sum, p) => sum + p * (1 - p), 0);

  const totals = Array.from({ length: n }, (_, attemptIdx) =>
    itemCorrectnessByAttempt.reduce((sum, item) => sum + item[attemptIdx]!, 0),
  );
  const mean = totals.reduce((a, b) => a + b, 0) / n;
  const variance = totals.reduce((sum, t) => sum + (t - mean) ** 2, 0) / n;

  if (variance === 0) return null;
  return (k / (k - 1)) * (1 - sumPQ / variance);
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function standardDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
