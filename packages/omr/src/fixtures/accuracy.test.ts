import { describe, expect, it } from 'vitest';

import { readOmrSheet } from '../reader/read';
import { buildOmrTemplate } from '../template';

import { generateSyntheticSheet } from './synthetic';

/**
 * Accuracy regression for the pure-TypeScript reader (docs/adr/0005): on clean synthetic
 * sheets, ≥99.5% of bubble groups (answers, student-number digits, booklet code) must be
 * read correctly. Every distorted sheet that would otherwise be misread (double mark,
 * partial erasure) must instead be flagged for the review queue, never silently wrong.
 */

const OPTIONS = ['A', 'B', 'C', 'D'] as const;
const QUESTION_COUNT = 24;
const STUDENT_NO = '482913';

function buildAnswerKey(): Record<number, string> {
  const answers: Record<number, string> = {};
  for (let question = 1; question <= QUESTION_COUNT; question += 1) {
    if (question % 6 === 0) continue; // deliberately left blank
    answers[question] = OPTIONS[question % OPTIONS.length]!;
  }
  return answers;
}

describe('OMR reader accuracy (synthetic fixtures)', () => {
  const template = buildOmrTemplate({
    questionCount: QUESTION_COUNT,
    optionCount: 4,
    studentNumberDigits: STUDENT_NO.length,
    bookletCodes: ['A', 'B'],
  });
  const answers = buildAnswerKey();

  it('reads >=99.5% of bubble groups correctly on clean, lightly-noised sheets', () => {
    const sheetCount = 15;
    let correct = 0;
    let total = 0;

    for (let sheet = 0; sheet < sheetCount; sheet += 1) {
      const image = generateSyntheticSheet(template, 0, {
        studentNo: STUDENT_NO,
        bookletCode: 'A',
        answers,
        noiseAmplitude: 6,
      });
      const result = readOmrSheet(image, template, 0);

      expect(result.needsReview).toBe(false);

      total += 1;
      if (result.studentNoRead === STUDENT_NO) correct += 1;

      total += 1;
      if (result.bookletCode === 'A') correct += 1;

      for (let question = 1; question <= QUESTION_COUNT; question += 1) {
        total += 1;
        const expected = answers[question] ?? null;
        const actual = result.answers[question];
        if (expected === null ? actual?.flag === 'blank' : actual?.value === expected) {
          correct += 1;
        }
      }
    }

    expect(correct / total).toBeGreaterThanOrEqual(0.995);
  });

  it('tolerates a moderate lighting gradient (shadow) without misreading a filled bubble', () => {
    const image = generateSyntheticSheet(template, 0, {
      studentNo: STUDENT_NO,
      bookletCode: 'A',
      answers,
      shadowStrength: 0.5,
    });
    const result = readOmrSheet(image, template, 0);

    expect(result.cornersFound).toBe(true);
    expect(result.needsReview).toBe(false);
    expect(result.studentNoRead).toBe(STUDENT_NO);
    expect(result.bookletCode).toBe('A');
    for (const [question, expected] of Object.entries(answers)) {
      expect(result.answers[Number(question)]?.value).toBe(expected);
    }
  });

  it('routes a double-marked question to review instead of scoring it', () => {
    const image = generateSyntheticSheet(template, 0, {
      studentNo: STUDENT_NO,
      bookletCode: 'A',
      answers,
      doubleMarkQuestions: [5],
    });
    const result = readOmrSheet(image, template, 0);

    expect(result.needsReview).toBe(true);
    expect(result.answers[5]?.flag).toBe('double');
    expect(result.answers[5]?.value).toBeNull();
    // Unaffected questions on the same sheet still read normally.
    expect(result.answers[1]?.value).toBe(answers[1]);
  });

  it('routes a partially-erased mark to review instead of guessing', () => {
    const image = generateSyntheticSheet(template, 0, {
      studentNo: STUDENT_NO,
      bookletCode: 'A',
      answers,
      partialEraseQuestions: [10],
    });
    const result = readOmrSheet(image, template, 0);

    expect(result.needsReview).toBe(true);
    expect(result.answers[10]?.flag).toBe('ambiguous');
    expect(result.answers[10]?.value).toBeNull();
  });

  it('flags an unreadable student number instead of guessing a digit', () => {
    const image = generateSyntheticSheet(template, 0, { answers, bookletCode: 'A' }); // no studentNo filled in
    const result = readOmrSheet(image, template, 0);
    expect(result.studentNoRead).toBeNull();
  });
});
