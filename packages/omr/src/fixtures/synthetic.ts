import { createSolidImage, paintRect, type RawImage } from '@testcim/image-tools';

import type { OmrAnswerBubble, OmrFormTemplate } from '../template';

/** Coarser than a real 300 DPI scan on purpose — the regression suite renders dozens of
 * these per run and only needs enough resolution for the sampling math to be exercised. */
export const FIXTURE_PX_PER_MM = 3;

function toPx(mm: number): number {
  return Math.round(mm * FIXTURE_PX_PER_MM);
}

export interface SyntheticSheetOptions {
  readonly studentNo?: string;
  readonly bookletCode?: string;
  readonly answers?: Readonly<Record<number, string>>;
  /** Fills both option A and option B for these question numbers, regardless of `answers`. */
  readonly doubleMarkQuestions?: readonly number[];
  /** Fills the `answers` choice with a mid-gray mark, landing in the ambiguous band. */
  readonly partialEraseQuestions?: readonly number[];
  readonly noiseAmplitude?: number;
  /** 0-1: linear left-to-right darkening, simulating an uneven light source. */
  readonly shadowStrength?: number;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function fillBubble(image: RawImage, bubble: OmrAnswerBubble, gray: number): RawImage {
  const cx = toPx(bubble.x + bubble.diameter / 2);
  const cy = toPx(bubble.y + bubble.diameter / 2);
  const half = Math.max(1, Math.round(toPx(bubble.diameter / 2) * 0.75));
  return paintRect(image, { x: cx - half, y: cy - half, width: half * 2, height: half * 2 }, [
    gray,
    gray,
    gray,
    255,
  ]);
}

function withShadow(image: RawImage, strength: number): RawImage {
  if (strength <= 0) return image;
  const data = new Uint8ClampedArray(image.data);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const factor = 1 - strength * (x / image.width);
      const i = (y * image.width + x) * 4;
      data[i] = clampByte(data[i]! * factor);
      data[i + 1] = clampByte(data[i + 1]! * factor);
      data[i + 2] = clampByte(data[i + 2]! * factor);
    }
  }
  return { width: image.width, height: image.height, data };
}

function withNoise(image: RawImage, amplitude: number): RawImage {
  if (amplitude <= 0) return image;
  const data = new Uint8ClampedArray(image.data);
  for (let i = 0; i < data.length; i += 4) {
    const jitter = (Math.random() * 2 - 1) * amplitude;
    data[i] = clampByte(data[i]! + jitter);
    data[i + 1] = clampByte(data[i + 1]! + jitter);
    data[i + 2] = clampByte(data[i + 2]! + jitter);
  }
  return { width: image.width, height: image.height, data };
}

/**
 * Renders a synthetic "scanned" answer sheet for one page of a template, with a known
 * answer key baked in. Used only by tests: it lets the reader's accuracy be measured
 * against ground truth without a real camera or scanner.
 */
export function generateSyntheticSheet(
  template: OmrFormTemplate,
  pageIndex: number,
  options: SyntheticSheetOptions = {},
): RawImage {
  const page = template.pages[pageIndex];
  if (!page) {
    throw new RangeError(`Template has no page at index ${pageIndex}.`);
  }

  let image = createSolidImage(
    toPx(template.pageWidthMm),
    toPx(template.pageHeightMm),
    [255, 255, 255, 255],
  );

  for (const corner of page.corners) {
    image = paintRect(
      image,
      { x: toPx(corner.x), y: toPx(corner.y), width: toPx(corner.size), height: toPx(corner.size) },
      [0, 0, 0, 255],
    );
  }

  if (page.studentNumber && options.studentNo) {
    for (const bubble of page.studentNumber) {
      if (options.studentNo[bubble.question] === bubble.option) {
        image = fillBubble(image, bubble, 20);
      }
    }
  }

  if (page.bookletCode && options.bookletCode) {
    for (const bubble of page.bookletCode) {
      if (bubble.option === options.bookletCode) {
        image = fillBubble(image, bubble, 20);
      }
    }
  }

  const doubleMark = new Set(options.doubleMarkQuestions ?? []);
  const partialErase = new Set(options.partialEraseQuestions ?? []);
  const answers = options.answers ?? {};

  for (const bubble of page.answers) {
    if (doubleMark.has(bubble.question)) {
      if (bubble.column === 0 || bubble.column === 1) {
        image = fillBubble(image, bubble, 20);
      }
      continue;
    }
    if (answers[bubble.question] === bubble.option) {
      image = fillBubble(image, bubble, partialErase.has(bubble.question) ? 160 : 20);
    }
  }

  image = withShadow(image, options.shadowStrength ?? 0);
  image = withNoise(image, options.noiseAmplitude ?? 0);

  return image;
}
