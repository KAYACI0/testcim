import PptxGenJS from 'pptxgenjs';

export interface PptxOption {
  readonly label: string;
  readonly text?: string;
  readonly imagePng?: Uint8Array;
}

export interface PptxQuestion {
  readonly number: number;
  readonly stemText?: string;
  readonly stemImagePng?: Uint8Array;
  readonly options: readonly PptxOption[];
  readonly correctLabel?: string;
}

export interface PptxExportData {
  readonly title: string;
  readonly className?: string;
  readonly questions: readonly PptxQuestion[];
  /** Localized label for the answer slide's "Doğru cevap" line. */
  readonly correctAnswerLabel: string;
}

function pngDataUrl(bytes: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
}

/**
 * Renders one slide per question — a presentation aid, not a paginated
 * document. Rich/formula/image stems and options render as an image (same
 * rationale as the DOCX exporter, ADR 12.1) rather than editable PPTX text.
 */
export async function renderTestPptx(data: PptxExportData): Promise<Uint8Array> {
  const pptx = new PptxGenJS();

  const titleSlide = pptx.addSlide();
  titleSlide.addText(data.title, { x: 0.5, y: 1.5, w: 9, h: 1.5, fontSize: 28, bold: true });
  if (data.className) {
    titleSlide.addText(data.className, { x: 0.5, y: 3, w: 9, h: 0.75, fontSize: 16, italic: true });
  }

  for (const question of data.questions) {
    const slide = pptx.addSlide();
    slide.addText(`${question.number}.`, {
      x: 0.4,
      y: 0.3,
      w: 1,
      h: 0.6,
      fontSize: 20,
      bold: true,
    });

    if (question.stemImagePng) {
      slide.addImage({ data: pngDataUrl(question.stemImagePng), x: 1.3, y: 0.3, w: 7, h: 2 });
    } else {
      slide.addText(question.stemText ?? '', { x: 1.3, y: 0.3, w: 7.5, h: 2, fontSize: 18 });
    }

    const optionTexts = question.options
      .filter((o) => !o.imagePng)
      .map((o) => ({ text: `${o.label}) ${o.text ?? ''}\n`, options: { fontSize: 14 } }));
    if (optionTexts.length > 0) {
      slide.addText(optionTexts, { x: 1.3, y: 2.5, w: 7.5, h: 3.5 });
    }

    let imageY = 2.5;
    for (const option of question.options) {
      if (!option.imagePng) continue;
      slide.addImage({
        data: pngDataUrl(option.imagePng),
        x: 1.3,
        y: imageY,
        w: 4,
        h: 1,
      });
      imageY += 1.1;
    }

    if (question.correctLabel) {
      slide.addText(`${data.correctAnswerLabel}: ${question.correctLabel}`, {
        x: 1.3,
        y: 6.8,
        w: 7.5,
        h: 0.5,
        fontSize: 12,
        italic: true,
      });
    }
  }

  const result = await pptx.write({ outputType: 'nodebuffer' });
  return new Uint8Array(result as Buffer);
}
