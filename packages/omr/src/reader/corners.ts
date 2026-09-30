import { CORNER_SEARCH_MM, type OmrCornerMark } from '../template';

import type { GrayImage } from './grayscale';
import type { Point } from './homography';

export interface CornerDetectionResult {
  readonly points: readonly [Point, Point, Point, Point];
  /** Lower is more confident: near 0 means a strong, well-separated dark blob was found. */
  readonly weaknesses: readonly [number, number, number, number];
}

interface SearchBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

function searchBox(
  mark: OmrCornerMark['id'],
  width: number,
  height: number,
  pageWidthMm: number,
  pageHeightMm: number,
): SearchBox {
  const spanX = (CORNER_SEARCH_MM / pageWidthMm) * width;
  const spanY = (CORNER_SEARCH_MM / pageHeightMm) * height;
  const left = mark === 'tl' || mark === 'bl';
  const top = mark === 'tl' || mark === 'tr';
  return {
    x0: left ? 0 : Math.max(0, width - spanX),
    x1: left ? Math.min(width, spanX) : width,
    y0: top ? 0 : Math.max(0, height - spanY),
    y1: top ? Math.min(height, spanY) : height,
  };
}

/**
 * Locates the weighted centroid of the darkest blob inside `box`, weighting each pixel
 * by how much darker it is than the box's own mean. This adapts to uneven lighting
 * within the corner region (docs/prompts/10: "gölge ve eğim toleransı") without needing
 * a full adaptive-threshold pass over the whole sheet.
 */
function darkCentroid(gray: GrayImage, box: SearchBox): { point: Point; weakness: number } {
  const x0 = Math.max(0, Math.floor(box.x0));
  const x1 = Math.min(gray.width - 1, Math.ceil(box.x1));
  const y0 = Math.max(0, Math.floor(box.y0));
  const y1 = Math.min(gray.height - 1, Math.ceil(box.y1));

  let sum = 0;
  let count = 0;
  let darkestPixel = 255;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const value = gray.data[y * gray.width + x]!;
      sum += value;
      count += 1;
      darkestPixel = Math.min(darkestPixel, value);
    }
  }
  const mean = count > 0 ? sum / count : 255;

  let weightSum = 0;
  let wx = 0;
  let wy = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const weight = Math.max(0, mean - gray.data[y * gray.width + x]!);
      weightSum += weight;
      wx += weight * x;
      wy += weight * y;
    }
  }

  if (weightSum <= 0) {
    return { point: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, weakness: 1 };
  }

  // A confident square mark pulls the mean well above the background: the more the
  // blob's own darkness dominates the region mean, the lower the reported weakness.
  const contrast = mean - darkestPixel;
  const weakness = contrast > 0 ? Math.max(0, 1 - contrast / 128) : 1;

  return { point: { x: wx / weightSum, y: wy / weightSum }, weakness };
}

/**
 * Finds the four corner marks in pixel space, assuming the image roughly frames the
 * full page (a reasonable precondition for a scanned/photographed answer sheet).
 */
export function findCornerMarks(
  gray: GrayImage,
  marks: readonly [OmrCornerMark, OmrCornerMark, OmrCornerMark, OmrCornerMark],
  pageWidthMm: number,
  pageHeightMm: number,
): CornerDetectionResult {
  const results = marks.map((mark) =>
    darkCentroid(gray, searchBox(mark.id, gray.width, gray.height, pageWidthMm, pageHeightMm)),
  );
  return {
    points: [results[0]!.point, results[1]!.point, results[2]!.point, results[3]!.point],
    weaknesses: [
      results[0]!.weakness,
      results[1]!.weakness,
      results[2]!.weakness,
      results[3]!.weakness,
    ],
  };
}
