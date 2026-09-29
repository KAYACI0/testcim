import { assertValidImage, type PixelBox, type RawImage } from './raw-image';

export interface ProjectionSplitOptions {
  /** Luminance (0-255) below which a pixel counts as ink. */
  readonly inkThreshold?: number;
  /** Minimum fraction of ink pixels in a row/column for it to count as "content". */
  readonly inkRatio?: number;
  /** Minimum gap (as a fraction of image width) that separates two columns. */
  readonly columnGapFraction?: number;
  /** Minimum gap (as a fraction of the column's height) that separates two blocks. */
  readonly blockGapFraction?: number;
}

function luminance(image: RawImage, x: number, y: number): number {
  const i = (y * image.width + x) * 4;
  const r = image.data[i]!;
  const g = image.data[i + 1]!;
  const b = image.data[i + 2]!;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function findRuns(covered: readonly boolean[]): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  let runStart: number | null = null;
  for (let i = 0; i < covered.length; i += 1) {
    if (covered[i] && runStart === null) {
      runStart = i;
    } else if (!covered[i] && runStart !== null) {
      runs.push({ start: runStart, end: i - 1 });
      runStart = null;
    }
  }
  if (runStart !== null) {
    runs.push({ start: runStart, end: covered.length - 1 });
  }
  return runs;
}

/** Merges runs separated by a gap smaller than `minGap` (in same-unit indices). */
function mergeCloseRuns(
  runs: readonly { start: number; end: number }[],
  minGap: number,
): { start: number; end: number }[] {
  if (runs.length === 0) {
    return [];
  }
  const merged: { start: number; end: number }[] = [{ ...runs[0]! }];
  for (let i = 1; i < runs.length; i += 1) {
    const last = merged.at(-1)!;
    const run = runs[i]!;
    if (run.start - last.end - 1 < minGap) {
      last.end = run.end;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

/**
 * Splits a scanned page into question blocks using two-pass projection
 * histograms (docs/adr/0003 §2, "metin katmanı yoksa"): vertical projection
 * finds column gaps, then a horizontal projection within each column finds
 * block gaps. Pure and synchronous — no DOM, no pdf.js.
 */
export function splitByProjection(
  image: RawImage,
  options: ProjectionSplitOptions = {},
): PixelBox[] {
  assertValidImage(image);
  const inkThreshold = options.inkThreshold ?? 200;
  const inkRatio = options.inkRatio ?? 0.02;
  const columnGapFraction = options.columnGapFraction ?? 0.03;
  const blockGapFraction = options.blockGapFraction ?? 0.02;

  const isInk = (x: number, y: number): boolean => luminance(image, x, y) < inkThreshold;

  const colInk = new Array<number>(image.width).fill(0);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (isInk(x, y)) {
        colInk[x]! += 1;
      }
    }
  }
  const colCovered = colInk.map((count) => count / image.height >= inkRatio);
  const columnMinGap = Math.max(1, Math.round(columnGapFraction * image.width));
  const columnRuns = mergeCloseRuns(findRuns(colCovered), columnMinGap);

  if (columnRuns.length === 0) {
    return [];
  }

  const blocks: PixelBox[] = [];

  for (const column of columnRuns) {
    const colWidth = column.end - column.start + 1;
    const rowInk = new Array<number>(image.height).fill(0);
    for (let y = 0; y < image.height; y += 1) {
      for (let x = column.start; x <= column.end; x += 1) {
        if (isInk(x, y)) {
          rowInk[y]! += 1;
        }
      }
    }
    const rowCovered = rowInk.map((count) => count / colWidth >= inkRatio);
    const blockMinGap = Math.max(1, Math.round(blockGapFraction * image.height));
    const rowRuns = mergeCloseRuns(findRuns(rowCovered), blockMinGap);

    for (const row of rowRuns) {
      blocks.push({
        x: column.start,
        y: row.start,
        width: colWidth,
        height: row.end - row.start + 1,
      });
    }
  }

  return blocks;
}
