import { Document, Header, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx';
import { TextWatermark } from 'docx/watermarks';

export interface ExportOption {
  readonly label: string;
  readonly text?: string;
  /** Rendered PNG bytes — used for rich/formula/image options instead of OMML (see ADR 12.1). */
  readonly imagePng?: Uint8Array;
}

export interface ExportQuestion {
  readonly number: number;
  readonly stemText?: string;
  /** Rendered PNG bytes for a rich-text/formula/image stem, in place of OMML — see ADR 12.1. */
  readonly stemImagePng?: Uint8Array;
  readonly options: readonly ExportOption[];
  /** Only set when the caller is exporting an answer key. */
  readonly correctLabel?: string;
}

export interface ExportTestData {
  readonly title: string;
  readonly className?: string;
  /** Per-question `correctLabel` (set by the caller) decides whether the answer key shows. */
  readonly questions: readonly ExportQuestion[];
  readonly watermarkText?: string;
  /** Localized label for the answer-key line — this package has no i18n dependency. */
  readonly correctAnswerLabel: string;
}

const IMAGE_WIDTH_PX = 400;
const IMAGE_HEIGHT_PX = 120;

function questionParagraphs(question: ExportQuestion, correctAnswerLabel: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (question.stemImagePng) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${question.number}. `, bold: true }),
          new ImageRun({
            type: 'png',
            data: question.stemImagePng,
            transformation: { width: IMAGE_WIDTH_PX, height: IMAGE_HEIGHT_PX },
          }),
        ],
      }),
    );
  } else {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${question.number}. `, bold: true }),
          new TextRun({ text: question.stemText ?? '' }),
        ],
      }),
    );
  }

  for (const option of question.options) {
    if (option.imagePng) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${option.label}) ` }),
            new ImageRun({
              type: 'png',
              data: option.imagePng,
              transformation: { width: IMAGE_WIDTH_PX, height: IMAGE_HEIGHT_PX / 2 },
            }),
          ],
        }),
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `${option.label}) ${option.text ?? ''}` })],
        }),
      );
    }
  }

  if (question.correctLabel) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${correctAnswerLabel}: ${question.correctLabel}`, italics: true }),
        ],
      }),
    );
  }

  paragraphs.push(new Paragraph({ text: '' }));
  return paragraphs;
}

/**
 * Renders a flowing single-column DOCX — one question per block, in reading
 * order. Rich/formula/image questions are embedded as rendered PNGs rather
 * than OMML (Office Math Markup): converting stored MathML to OMML needs a
 * dedicated transform this repo doesn't have, and PNG reuses the render path
 * already used for question previews (ADR 12.1). The tradeoff: exported math
 * isn't editable in Word, only viewable.
 */
export async function renderTestDocx(data: ExportTestData): Promise<Uint8Array> {
  const children: Paragraph[] = [
    new Paragraph({ text: data.title, heading: HeadingLevel.HEADING_1 }),
  ];
  if (data.className) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: data.className, italics: true })] }),
    );
  }
  children.push(new Paragraph({ text: '' }));

  for (const question of data.questions) {
    children.push(...questionParagraphs(question, data.correctAnswerLabel));
  }

  const doc = new Document({
    sections: [
      {
        ...(data.watermarkText
          ? {
              headers: {
                default: new Header({
                  children: [
                    new Paragraph({ children: [new TextWatermark({ text: data.watermarkText })] }),
                  ],
                }),
              },
            }
          : {}),
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
