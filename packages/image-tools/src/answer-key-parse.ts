import type { PdfTextItem } from './pdf-text';

export const ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
export type AnswerLetter = (typeof ANSWER_LETTERS)[number];

export interface AnswerKeyEntry {
  readonly number: number;
  readonly letter: AnswerLetter;
}

const PAIR_RE = /(\d{1,3})\s*[-.)]\s*([A-E])\b/g;

/**
 * Extracts "12-A", "12.A", "12)A" style answer-key pairs from a page's text
 * layer (docs/adr/0003 §5). A number seen with two different letters is
 * ambiguous and dropped entirely rather than guessed at — matches docs/02
 * ilke 5 ("yapay zekâ taslak üretir, öğretmen onaylar"; here, no AI at all,
 * so an unconfident match is simply not offered as a suggestion).
 */
export function parseAnswerKeyTable(items: readonly PdfTextItem[]): AnswerKeyEntry[] {
  const text = items.map((item) => item.str).join(' ');
  const seen = new Map<number, Set<AnswerLetter>>();

  for (const match of text.matchAll(PAIR_RE)) {
    const number = Number.parseInt(match[1]!, 10);
    const letter = match[2] as AnswerLetter;
    const letters = seen.get(number) ?? new Set<AnswerLetter>();
    letters.add(letter);
    seen.set(number, letters);
  }

  const entries: AnswerKeyEntry[] = [];
  for (const [number, letters] of seen) {
    if (letters.size === 1) {
      entries.push({ number, letter: [...letters][0]! });
    }
  }

  return entries.sort((a, b) => a.number - b.number);
}
