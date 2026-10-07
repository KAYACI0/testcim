import type { ExportImage, ExportTestData } from '@testcim/renderers/export';

export interface ExportQuestionSource {
  readonly id: string;
  /** The letter of the correct answer, when the question has a choice key. */
  readonly correctLabel: string | null;
}

export interface BuildExportDataInput {
  readonly title: string;
  readonly className: string;
  /** In the order they appear on the paper. */
  readonly questions: readonly ExportQuestionSource[];
  readonly images: ReadonlyMap<string, ExportImage>;
  /** Put the answer on each question; follows the paper's "answer key" switch. */
  readonly includeAnswers: boolean;
  readonly correctAnswerLabel: string;
}

/**
 * Maps the questions on the paper to the shape the Word and PowerPoint builders take.
 * Numbers follow the paper, so the file reads in the same order as the printed test.
 */
export function buildExportData(input: BuildExportDataInput): ExportTestData {
  return {
    title: input.title,
    ...(input.className ? { className: input.className } : {}),
    correctAnswerLabel: input.correctAnswerLabel,
    questions: input.questions.map((question, index) => {
      const image = input.images.get(question.id);
      return {
        number: index + 1,
        options: [],
        ...(image ? { stemImage: image } : {}),
        ...(input.includeAnswers && question.correctLabel
          ? { correctLabel: question.correctLabel }
          : {}),
      };
    }),
  };
}
