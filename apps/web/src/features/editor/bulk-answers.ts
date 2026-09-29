export interface ParsedAnswer {
  readonly index: number;
  readonly letter: string;
}

const NUMBERED_PAIR = /(\d+)\s*[-:.)]?\s*([A-Ea-e])/g;
const VALID_LETTER = /^[A-Ea-e]$/;

/**
 * Parses the "hızlı cevap girişi" field (docs/prompts/04 §D): either a bare
 * run of letters (`"ABCDDCBA"`) or numbered pairs (`"1-A 2-C"`, `"1) A 2) C"`,
 * "1.A 2.B"). Numbered pairs win whenever the input has any digit in it,
 * since a bare letter run never does.
 */
export function parseBulkAnswers(input: string): ParsedAnswer[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  if (/\d/.test(trimmed)) {
    const pairs: ParsedAnswer[] = [];
    for (const match of trimmed.matchAll(NUMBERED_PAIR)) {
      pairs.push({ index: Number.parseInt(match[1]!, 10), letter: match[2]!.toUpperCase() });
    }
    return pairs;
  }

  const letters = trimmed.replace(/\s+/g, '');
  if (![...letters].every((char) => VALID_LETTER.test(char))) {
    return [];
  }

  return [...letters].map((letter, i) => ({ index: i + 1, letter: letter.toUpperCase() }));
}
