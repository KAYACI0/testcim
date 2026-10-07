import PptxGenJS from 'pptxgenjs';

import { fitInside, toBase64, type ExportImage } from './export-image';

export interface PptxOption {
  readonly label: string;
  readonly text?: string;
  readonly image?: ExportImage;
}

export interface PptxQuestion {
  readonly number: number;
  readonly stemText?: string;
  readonly stemImage?: ExportImage;
  readonly options: readonly PptxOption[];
  readonly correctLabel?: string;
}

export interface PptxExportData {
  readonly title: string;
  readonly className?: string;
  readonly questions: readonly PptxQuestion[];
  /** Localized label for the answer slide's correct-answer line. */
  readonly correctAnswerLabel: string;
}

/** The default 16:9 slide, in inches. Everything below stays inside it. */
const SLIDE = { width: 10, height: 5.625 } as const;
const IMAGE_BOX = { x: 1.1, y: 0.35, width: 8.4, height: 4.45 } as const;
const ANSWER_Y = 4.95;

function dataUrl(image: ExportImage): string {
  const mime = image.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${toBase64(image.bytes)}`;
}

/**
 * Renders one slide per question: a presentation aid, not a paginated document. The
 * question picture is centred in the slide's body at its own shape, never stretched, and
 * everything fits the 16:9 slide. Rich and formula questions are pictures here too
 * (ADR 0007). Runs in Node and in a browser Worker alike.
 */
export async function renderTestPptx(data: PptxExportData): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const titleSlide = pptx.addSlide();
  titleSlide.addText(data.title, {
    x: 0.5,
    y: 1.4,
    w: SLIDE.width - 1,
    h: 1.2,
    fontSize: 28,
    bold: true,
  });
  if (data.className) {
    titleSlide.addText(data.className, {
      x: 0.5,
      y: 2.7,
      w: SLIDE.width - 1,
      h: 0.6,
      fontSize: 16,
      italic: true,
    });
  }

  for (const question of data.questions) {
    const slide = pptx.addSlide();
    slide.addText(`${question.number}.`, {
      x: 0.4,
      y: 0.3,
      w: 0.7,
      h: 0.5,
      fontSize: 20,
      bold: true,
    });

    const textOptions = question.options.filter((option) => !option.image);
    const pictureOptions = question.options.filter((option) => option.image);
    // Leave room under the stem for options, so nothing overlaps.
    const optionsHeight = textOptions.length * 0.3 + pictureOptions.length * 0.6;
    const stemHeight = Math.max(1.5, IMAGE_BOX.height - optionsHeight);

    let cursorY = IMAGE_BOX.y;
    if (question.stemImage) {
      const size = fitInside(
        question.stemImage,
        IMAGE_BOX.width,
        stemHeight,
        Number.POSITIVE_INFINITY,
      );
      slide.addImage({
        data: dataUrl(question.stemImage),
        x: IMAGE_BOX.x + (IMAGE_BOX.width - size.width) / 2,
        y: cursorY,
        w: size.width,
        h: size.height,
      });
      cursorY += size.height + 0.1;
    } else {
      slide.addText(question.stemText ?? '', {
        x: IMAGE_BOX.x,
        y: cursorY,
        w: IMAGE_BOX.width,
        h: stemHeight,
        fontSize: 18,
        valign: 'top',
      });
      cursorY += stemHeight;
    }

    if (textOptions.length > 0) {
      slide.addText(
        textOptions.map((option) => ({
          text: `${option.label}) ${option.text ?? ''}\n`,
          options: { fontSize: 14 },
        })),
        {
          x: IMAGE_BOX.x,
          y: cursorY,
          w: IMAGE_BOX.width,
          h: textOptions.length * 0.3,
          valign: 'top',
        },
      );
      cursorY += textOptions.length * 0.3;
    }

    for (const option of pictureOptions) {
      const picture = option.image as ExportImage;
      const size = fitInside(picture, 4, 0.5);
      slide.addImage({
        data: dataUrl(picture),
        x: IMAGE_BOX.x,
        y: cursorY,
        w: size.width,
        h: size.height,
      });
      cursorY += 0.6;
    }

    if (question.correctLabel) {
      slide.addText(`${data.correctAnswerLabel}: ${question.correctLabel}`, {
        x: IMAGE_BOX.x,
        y: ANSWER_Y,
        w: IMAGE_BOX.width,
        h: 0.45,
        fontSize: 12,
        italic: true,
      });
    }
  }

  return (await pptx.write({ outputType: 'uint8array' })) as Uint8Array;
}
