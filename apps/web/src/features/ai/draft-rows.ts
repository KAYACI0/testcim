import {
  OPTION_LETTERS,
  textToRichDoc,
  type AiQuestionType,
  type AnswerKey,
  type NormalizedAiQuestion,
} from '@testcim/shared';

/** `questions` columns an AI draft fills; everything else keeps its column default. */
export interface DraftQuestionFields {
  readonly kind: 'rich';
  readonly question_type: AiQuestionType;
  readonly stem_rich: ReturnType<typeof textToRichDoc>;
  readonly stem_text: string;
  readonly options: { id: string; text: string; richText: Record<string, unknown> }[];
  readonly option_count: number | null;
  readonly correct: AnswerKey | null;
  readonly explanation_rich: ReturnType<typeof textToRichDoc> | null;
  readonly difficulty: number | null;
  readonly ai_generated: true;
  readonly ai_review_status: 'draft';
}

export function buildOptions(texts: readonly string[]): DraftQuestionFields['options'] {
  return texts.slice(0, OPTION_LETTERS.length).map((text, index) => ({
    id: OPTION_LETTERS[index] as string,
    text,
    richText: textToRichDoc(text),
  }));
}

export function buildAnswerKey(
  type: AiQuestionType,
  question: Pick<NormalizedAiQuestion, 'correctOptionId' | 'trueFalseValue' | 'explanation'>,
): AnswerKey | null {
  if (type === 'mcq') {
    return question.correctOptionId
      ? { question_type: 'mcq', option_id: question.correctOptionId }
      : null;
  }

  if (type === 'tf') {
    return question.trueFalseValue === null
      ? null
      : { question_type: 'tf', value: question.trueFalseValue };
  }

  return question.explanation
    ? { question_type: 'open', rubric: question.explanation }
    : { question_type: 'open' };
}

/** Builds the draft row for one validated AI question; it always lands as `draft`, never approved. */
export function buildDraftFields(
  type: AiQuestionType,
  question: NormalizedAiQuestion,
): DraftQuestionFields {
  const options = type === 'mcq' ? buildOptions(question.options) : [];

  return {
    kind: 'rich',
    question_type: type,
    stem_rich: textToRichDoc(question.stem),
    stem_text: question.stem,
    options,
    option_count: options.length > 0 ? options.length : null,
    correct: buildAnswerKey(type, question),
    explanation_rich: question.explanation ? textToRichDoc(question.explanation) : null,
    difficulty: question.difficulty,
    ai_generated: true,
    ai_review_status: 'draft',
  };
}
