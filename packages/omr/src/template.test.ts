import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { buildOmrTemplate, PAGE_HEIGHT_MM, PAGE_WIDTH_MM } from './template';

describe('buildOmrTemplate', () => {
  it('numbers every question exactly once, in order, across pages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 2, max: 5 }),
        (questionCount, optionCount) => {
          const template = buildOmrTemplate({ questionCount, optionCount });
          const questions = template.pages.flatMap((page) =>
            page.answers.map((bubble) => bubble.question),
          );
          const unique = new Set(questions);

          expect(unique.size).toBe(questionCount);
          expect(Math.min(...questions)).toBe(1);
          expect(Math.max(...questions)).toBe(questionCount);
          for (const bubble of template.pages.flatMap((page) => page.answers)) {
            expect(bubble.question).toBeGreaterThanOrEqual(1);
            expect(bubble.question).toBeLessThanOrEqual(questionCount);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('gives every question exactly optionCount bubbles', () => {
    const template = buildOmrTemplate({ questionCount: 37, optionCount: 5 });
    const perQuestion = new Map<number, number>();
    for (const bubble of template.pages.flatMap((page) => page.answers)) {
      perQuestion.set(bubble.question, (perQuestion.get(bubble.question) ?? 0) + 1);
    }
    expect(perQuestion.size).toBe(37);
    for (const count of perQuestion.values()) {
      expect(count).toBe(5);
    }
  });

  it('keeps every bubble within the page bounds', () => {
    const template = buildOmrTemplate({
      questionCount: 150,
      optionCount: 4,
      studentNumberDigits: 8,
    });
    for (const page of template.pages) {
      const allBubbles = [
        ...page.answers,
        ...(page.studentNumber ?? []),
        ...(page.bookletCode ?? []),
      ];
      for (const bubble of allBubbles) {
        expect(bubble.x).toBeGreaterThanOrEqual(0);
        expect(bubble.y).toBeGreaterThanOrEqual(0);
        expect(bubble.x + bubble.diameter).toBeLessThanOrEqual(PAGE_WIDTH_MM);
        expect(bubble.y + bubble.diameter).toBeLessThanOrEqual(PAGE_HEIGHT_MM);
      }
    }
  });

  it('puts the student number, booklet code and text fields only on page 1', () => {
    const template = buildOmrTemplate({ questionCount: 120, bookletCodes: ['A', 'B', 'C'] });
    expect(template.pages[0]!.studentNumber).not.toBeNull();
    expect(template.pages[0]!.bookletCode).not.toBeNull();
    expect(template.pages[0]!.nameField).not.toBeNull();
    for (const page of template.pages.slice(1)) {
      expect(page.studentNumber).toBeNull();
      expect(page.bookletCode).toBeNull();
      expect(page.nameField).toBeNull();
    }
  });

  it('omits the booklet-code grid when no codes are given', () => {
    const template = buildOmrTemplate({ questionCount: 10, bookletCodes: [] });
    expect(template.pages[0]!.bookletCode).toBeNull();
  });

  it('rejects an out-of-range question count', () => {
    expect(() => buildOmrTemplate({ questionCount: 0 })).toThrow(RangeError);
    expect(() => buildOmrTemplate({ questionCount: 201 })).toThrow(RangeError);
  });

  it('rejects an out-of-range option count', () => {
    expect(() => buildOmrTemplate({ questionCount: 10, optionCount: 1 })).toThrow(RangeError);
    expect(() => buildOmrTemplate({ questionCount: 10, optionCount: 6 })).toThrow(RangeError);
  });
});
