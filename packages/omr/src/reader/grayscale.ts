import type { RawImage } from '@testcim/image-tools';

/** Single-channel luminance, one value per pixel, row-major. No DOM dependency. */
export interface GrayImage {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;
}

export function toGrayscale(image: RawImage): GrayImage {
  const data = new Float32Array(image.width * image.height);
  for (let i = 0, p = 0; p < data.length; i += 4, p += 1) {
    data[p] = 0.299 * image.data[i]! + 0.587 * image.data[i + 1]! + 0.114 * image.data[i + 2]!;
  }
  return { width: image.width, height: image.height, data };
}

/** Mean luminance of a small square patch centered at (cx, cy), clamped to bounds. */
export function sampleMeanIntensity(
  gray: GrayImage,
  cx: number,
  cy: number,
  radius: number,
): number {
  const x0 = Math.max(0, Math.round(cx - radius));
  const x1 = Math.min(gray.width - 1, Math.round(cx + radius));
  const y0 = Math.max(0, Math.round(cy - radius));
  const y1 = Math.min(gray.height - 1, Math.round(cy + radius));

  let total = 0;
  let count = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      total += gray.data[y * gray.width + x]!;
      count += 1;
    }
  }

  return count > 0 ? total / count : 255;
}
