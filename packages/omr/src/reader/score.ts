/** Below this a bubble reads as clearly unmarked. */
const BLANK_CEILING = 0.35;
/** At or above this a bubble reads as clearly marked. Between the two is the ambiguous band. */
const FILLED_FLOOR = 0.55;

export type OmrMarkFlag = 'ok' | 'blank' | 'double' | 'ambiguous';

export interface OmrGroupResult {
  readonly value: string | null;
  readonly confidence: number;
  readonly flag: OmrMarkFlag;
}

export interface ScoredOption {
  readonly option: string;
  readonly fillRatio: number;
}

/**
 * Turns one group of mutually-exclusive bubbles (one question's options, one student-number
 * digit column, or the booklet-code row) into a single answer. Anything that isn't a clean
 * single mark or a clean blank is flagged for the review queue instead of guessed
 * (docs/prompts/10: "belirsiz okumalar ... sessizce yanlış puanlanmıyor").
 */
export function scoreGroup(options: readonly ScoredOption[]): OmrGroupResult {
  const filled = options.filter((option) => option.fillRatio >= FILLED_FLOOR);
  const ambiguous = options.filter(
    (option) => option.fillRatio > BLANK_CEILING && option.fillRatio < FILLED_FLOOR,
  );

  if (filled.length === 0 && ambiguous.length === 0) {
    const top = Math.max(...options.map((option) => option.fillRatio), 0);
    return { value: null, confidence: clamp01(1 - top), flag: 'blank' };
  }

  if (filled.length >= 2) {
    return { value: null, confidence: 0, flag: 'double' };
  }

  if (filled.length === 1 && ambiguous.length === 0) {
    const sorted = [...options].sort((a, b) => b.fillRatio - a.fillRatio);
    const gap = sorted[0]!.fillRatio - (sorted[1]?.fillRatio ?? 0);
    return { value: filled[0]!.option, confidence: clamp01(gap), flag: 'ok' };
  }

  return { value: null, confidence: 0, flag: 'ambiguous' };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
