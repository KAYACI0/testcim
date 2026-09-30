import type { RawImage } from '@testcim/image-tools';

import { findCornerMarks } from './corners';
import { toGrayscale } from './grayscale';
import { solveHomography, type Point } from './homography';
import { sampleBubbleFill } from './sample';
import { scoreGroup, type OmrGroupResult } from './score';

import type { OmrAnswerBubble, OmrFormTemplate, OmrPageTemplate } from '../template';

/** Above this, a corner mark's own detection is too weak to trust the resulting homography. */
const CORNER_WEAKNESS_LIMIT = 0.6;

export interface OmrReadResult {
  readonly pageIndex: number;
  readonly cornersFound: boolean;
  readonly studentNoRead: string | null;
  readonly bookletCode: string | null;
  /** Keyed by question number. */
  readonly answers: Readonly<Record<number, OmrGroupResult>>;
  readonly needsReview: boolean;
  readonly reasons: readonly string[];
}

function groupByQuestion(bubbles: readonly OmrAnswerBubble[]): Map<number, OmrAnswerBubble[]> {
  const groups = new Map<number, OmrAnswerBubble[]>();
  for (const bubble of bubbles) {
    const group = groups.get(bubble.question);
    if (group) {
      group.push(bubble);
    } else {
      groups.set(bubble.question, [bubble]);
    }
  }
  return groups;
}

function readDigitGrid(
  gray: ReturnType<typeof toGrayscale>,
  h: ReturnType<typeof solveHomography>,
  bubbles: readonly OmrAnswerBubble[] | null,
  digitCount: number,
): { value: string | null; ambiguous: boolean } {
  if (!bubbles || bubbles.length === 0) {
    return { value: null, ambiguous: false };
  }

  const groups = groupByQuestion(bubbles);
  const digits: string[] = [];
  let ambiguous = false;

  for (let position = 0; position < digitCount; position += 1) {
    const group = groups.get(position) ?? [];
    const scored = group.map((bubble) => ({
      option: bubble.option,
      fillRatio: sampleBubbleFill(gray, h, bubble).fillRatio,
    }));
    const result = scoreGroup(scored);
    if (result.flag !== 'ok') {
      ambiguous = true;
      digits.push('?');
    } else {
      digits.push(result.value!);
    }
  }

  return { value: ambiguous ? null : digits.join(''), ambiguous };
}

/**
 * Reads one scanned/photographed page against the template it was printed from.
 * Corner detection failure or any ambiguous mark routes the whole page to the review
 * queue rather than guessing (docs/prompts/10 acceptance criteria).
 */
export function readOmrSheet(
  image: RawImage,
  template: OmrFormTemplate,
  pageIndex = 0,
): OmrReadResult {
  const page: OmrPageTemplate | undefined = template.pages[pageIndex];
  if (!page) {
    throw new RangeError(`Template has no page at index ${pageIndex}.`);
  }

  const gray = toGrayscale(image);
  const { points, weaknesses } = findCornerMarks(
    gray,
    page.corners,
    template.pageWidthMm,
    template.pageHeightMm,
  );

  if (weaknesses.some((weakness) => weakness > CORNER_WEAKNESS_LIMIT)) {
    return {
      pageIndex,
      cornersFound: false,
      studentNoRead: null,
      bookletCode: null,
      answers: {},
      needsReview: true,
      reasons: ['corners_not_found'],
    };
  }

  const templateCorners: readonly Point[] = page.corners.map((corner) => ({
    x: corner.x + corner.size / 2,
    y: corner.y + corner.size / 2,
  }));
  const h = solveHomography(templateCorners, points);

  const reasons: string[] = [];

  const studentNumber = readDigitGrid(gray, h, page.studentNumber, template.studentNumberDigits);
  if (studentNumber.ambiguous) {
    reasons.push('student_number_ambiguous');
  }

  let bookletCode: string | null = null;
  if (page.bookletCode) {
    const scored = page.bookletCode.map((bubble) => ({
      option: bubble.option,
      fillRatio: sampleBubbleFill(gray, h, bubble).fillRatio,
    }));
    const result = scoreGroup(scored);
    if (result.flag === 'ok') {
      bookletCode = result.value;
    } else {
      reasons.push('booklet_code_ambiguous');
    }
  }

  const answers: Record<number, OmrGroupResult> = {};
  let anyAnswerAmbiguous = false;
  for (const [question, bubbles] of groupByQuestion(page.answers)) {
    const scored = bubbles.map((bubble) => ({
      option: bubble.option,
      fillRatio: sampleBubbleFill(gray, h, bubble).fillRatio,
    }));
    const result = scoreGroup(scored);
    answers[question] = result;
    if (result.flag === 'double' || result.flag === 'ambiguous') {
      anyAnswerAmbiguous = true;
    }
  }
  if (anyAnswerAmbiguous) {
    reasons.push('answer_ambiguous');
  }

  return {
    pageIndex,
    cornersFound: true,
    studentNoRead: studentNumber.value,
    bookletCode,
    answers,
    needsReview: reasons.length > 0,
    reasons,
  };
}
