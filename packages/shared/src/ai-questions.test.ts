import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  generateQuestionsInputSchema,
  normalizeAiQuestions,
  richDocToText,
  textToRichDoc,
  type AiQuestionDraft,
} from './ai-questions';

const mcq = (overrides: Partial<AiQuestionDraft> = {}): AiQuestionDraft => ({
  stem: 'Soru kökü',
  options: ['bir', 'iki', 'üç', 'dört'],
  correct_index: 2,
  explanation: 'Çözüm',
  difficulty: 3,
  ...overrides,
});

describe('normalizeAiQuestions', () => {
  it('maps the correct index to a letter id', () => {
    const [question] = normalizeAiQuestions([mcq()], 'mcq', 5);
    expect(question?.correctOptionId).toBe('C');
    expect(question?.options).toHaveLength(4);
  });

  it('drops questions with an out-of-range or missing correct index', () => {
    const result = normalizeAiQuestions(
      [mcq({ correct_index: 4 }), mcq({ correct_index: -1 }), mcq({ correct_index: null })],
      'mcq',
      5,
    );
    expect(result).toHaveLength(0);
  });

  it('drops questions with duplicate options, too few options or an empty stem', () => {
    const result = normalizeAiQuestions(
      [
        mcq({ options: ['a', 'a', 'b', 'c'] }),
        mcq({ options: ['a'], correct_index: 0 }),
        mcq({ stem: '   ' }),
        mcq({ options: ['a', 'b', 'c', 'd', 'e', 'f'] }),
      ],
      'mcq',
      5,
    );
    expect(result).toHaveLength(0);
  });

  it('keeps true/false questions as a boolean with no options', () => {
    const [yes, no] = normalizeAiQuestions(
      [mcq({ options: [], correct_index: 0 }), mcq({ options: [], correct_index: 1 })],
      'tf',
      5,
    );
    expect(yes?.trueFalseValue).toBe(true);
    expect(no?.trueFalseValue).toBe(false);
    expect(yes?.options).toEqual([]);
  });

  it('keeps open questions without a correct answer', () => {
    const [question] = normalizeAiQuestions([mcq({ options: ['x'], correct_index: 1 })], 'open', 5);
    expect(question?.options).toEqual([]);
    expect(question?.correctOptionId).toBeNull();
  });

  it('never returns more than maxCount items and keeps difficulty in 1 to 5', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            stem: fc.string(),
            options: fc.array(fc.string(), { maxLength: 8 }),
            correct_index: fc.option(fc.integer({ min: -3, max: 10 }), { nil: null }),
            explanation: fc.string(),
            difficulty: fc.oneof(fc.double({ noNaN: false }), fc.integer({ min: -10, max: 10 })),
          }),
          { maxLength: 30 },
        ),
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom('mcq', 'tf', 'open' as const),
        (drafts, maxCount, type) => {
          const result = normalizeAiQuestions(drafts, type, maxCount);
          expect(result.length).toBeLessThanOrEqual(maxCount);
          for (const question of result) {
            expect(question.difficulty).toBeGreaterThanOrEqual(1);
            expect(question.difficulty).toBeLessThanOrEqual(5);
            expect(question.stem.length).toBeGreaterThan(0);
            if (type === 'mcq') {
              expect(question.correctOptionId).not.toBeNull();
              expect(new Set(question.options).size).toBe(question.options.length);
            }
          }
        },
      ),
    );
  });
});

describe('textToRichDoc', () => {
  it('turns $latex$ into equation nodes between text', () => {
    const doc = textToRichDoc('x değeri $x^2 = 4$ ise kaçtır?');
    expect(doc.content).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'x değeri ' },
          { type: 'equation', attrs: { latex: 'x^2 = 4' } },
          { type: 'text', text: ' ise kaçtır?' },
        ],
      },
    ]);
  });

  it('keeps an unmatched dollar sign as text and an escaped one as a dollar', () => {
    const doc = textToRichDoc(String.raw`Fiyat 5 $ ve \$3`);
    const content = (doc.content[0] as { content: Array<{ type: string; text?: string }> }).content;
    expect(content.every((node) => node.type === 'text')).toBe(true);
    expect(content.map((node) => node.text).join('')).toBe('Fiyat 5 $ ve $3');
  });

  it('splits lines into paragraphs and returns an empty paragraph for blank input', () => {
    expect(textToRichDoc('bir\n\n iki ').content).toHaveLength(2);
    expect(textToRichDoc('   ').content).toEqual([{ type: 'paragraph' }]);
  });

  it('round-trips plain text through richDocToText', () => {
    const text = 'Birinci satır $a+b$ sonu\nİkinci satır';
    expect(richDocToText(textToRichDoc(text))).toBe(text);
  });

  it('never throws and produces a doc for any input', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const doc = textToRichDoc(text);
        expect(doc.type).toBe('doc');
        expect(Array.isArray(doc.content)).toBe(true);
        richDocToText(doc);
      }),
    );
  });
});

describe('generateQuestionsInputSchema', () => {
  const base = { grade: 8, difficulty: 3, count: 5, questionType: 'mcq' as const };

  it('requires an outcome or a topic', () => {
    expect(generateQuestionsInputSchema.safeParse(base).success).toBe(false);
    expect(generateQuestionsInputSchema.safeParse({ ...base, topic: 'Üslü sayılar' }).success).toBe(
      true,
    );
  });

  it('bounds count and defaults the option count to four', () => {
    const parsed = generateQuestionsInputSchema.parse({ ...base, topic: 'x' });
    expect(parsed.optionCount).toBe(4);
    expect(generateQuestionsInputSchema.safeParse({ ...base, topic: 'x', count: 11 }).success).toBe(
      false,
    );
    expect(generateQuestionsInputSchema.safeParse({ ...base, topic: 'x', count: 0 }).success).toBe(
      false,
    );
  });
});
