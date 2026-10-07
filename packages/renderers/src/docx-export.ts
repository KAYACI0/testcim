import { Document, Header, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx';
import { TextWatermark } from 'docx/watermarks';

import { fitInside, type ExportImage } from './export-image';

export interface ExportOption {
  readonly label: string;
  readonly text?: string;
  /** A picture option, in place of text. */
  readonly image?: ExportImage;
}

export interface ExportQuestion {
  readonly number: number;
  readonly stemText?: string;
  /** The question as a picture: a pasted screenshot or a rich question rendered at save time (ADR 0007). */
  readonly stemImage?: ExportImage;
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
  /** Localized label for the answer-key line; this package has no i18n dependency. */
  readonly correctAnswerLabel: string;
}

/** A4 with one-inch margins leaves about 6.3 x 9.7 inches, in 96 dpi pixels. */
const MAX_STEM_WIDTH_PX = 600;
const MAX_STEM_HEIGHT_PX = 880;
const MAX_OPTION_WIDTH_PX = 300;
const MAX_OPTION_HEIGHT_PX = 120;

function imageRun(image: ExportImage, maxWidth: number, maxHeight: number): ImageRun {
  const size = fitInside(image, maxWidth, maxHeight);
  return new ImageRun({
    type: image.format === 'jpeg' ? 'jpg' : 'png',
    data: image.bytes,
    transformation: { width: Math.round(size.width), height: Math.round(size.height) },
  });
}

function questionParagraphs(question: ExportQuestion, correctAnswerLabel: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${question.number}. `, bold: true }),
        question.stemImage
          ? imageRun(question.stemImage, MAX_STEM_WIDTH_PX, MAX_STEM_HEIGHT_PX)
          : new TextRun({ text: question.stemText ?? '' }),
      ],
    }),
  );

  for (const option of question.options) {
    paragraphs.push(
      new Paragraph({
        children: option.image
          ? [
              new TextRun({ text: `${option.label}) ` }),
              imageRun(option.image, MAX_OPTION_WIDTH_PX, MAX_OPTION_HEIGHT_PX),
            ]
          : [new TextRun({ text: `${option.label}) ${option.text ?? ''}` })],
      }),
    );
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
 * Renders a flowing single-column DOCX, one question per block in reading order.
 * Rich, formula and image questions are embedded as pictures rather than OMML (Office
 * Math Markup): converting stored MathML to OMML needs a dedicated transform this repo
 * does not have, and a picture reuses the render every question already has (ADR 0007).
 * The tradeoff is that exported math is viewable in Word, not editable. Runs in Node and in
 * a browser Worker alike.
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

  return Packer.pack(doc, 'uint8array');
}
