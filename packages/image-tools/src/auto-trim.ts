import { assertValidImage, type PixelBox, type RawImage } from './raw-image';

export interface AutoTrimOptions {
  /** Max per-channel (R/G/B/A) distance from the estimated background still counted as background. */
  readonly tolerance?: number;
  /** Inner padding kept around the detected content, in pixels (docs/02 §5.1: 6px). */
  readonly padding?: number;
}

interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

function samplePatch(image: RawImage, cx: number, cy: number, radius: number): Rgba {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let count = 0;

  for (let y = Math.max(0, cy - radius); y <= Math.min(image.height - 1, cy + radius); y += 1) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(image.width - 1, cx + radius); x += 1) {
      const i = (y * image.width + x) * 4;
      r += image.data[i]!;
      g += image.data[i + 1]!;
      b += image.data[i + 2]!;
      a += image.data[i + 3]!;
      count += 1;
    }
  }

  return { r: r / count, g: g / count, b: b / count, a: a / count };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Bilinear interpolation of the four corner colors, used as the expected
 * background at (x, y). This is what keeps a smoothly shading background
 * (docs/02 §5.1: "gradyanlı ekran görüntülerinde bozulmamalı") from being
 * mistaken for content everywhere except its four corners.
 */
function backgroundAt(corners: readonly [Rgba, Rgba, Rgba, Rgba], tx: number, ty: number): Rgba {
  const [tl, tr, bl, br] = corners;
  const top = {
    r: lerp(tl.r, tr.r, tx),
    g: lerp(tl.g, tr.g, tx),
    b: lerp(tl.b, tr.b, tx),
    a: lerp(tl.a, tr.a, tx),
  };
  const bottom = {
    r: lerp(bl.r, br.r, tx),
    g: lerp(bl.g, br.g, tx),
    b: lerp(bl.b, br.b, tx),
    a: lerp(bl.a, br.a, tx),
  };

  return {
    r: lerp(top.r, bottom.r, ty),
    g: lerp(top.g, bottom.g, ty),
    b: lerp(top.b, bottom.b, ty),
    a: lerp(top.a, bottom.a, ty),
  };
}

function maxChannelDiff(image: RawImage, x: number, y: number, expected: Rgba): number {
  const i = (y * image.width + x) * 4;
  return Math.max(
    Math.abs(image.data[i]! - expected.r),
    Math.abs(image.data[i + 1]! - expected.g),
    Math.abs(image.data[i + 2]! - expected.b),
    Math.abs(image.data[i + 3]! - expected.a),
  );
}

function isBackgroundPixel(
  image: RawImage,
  corners: readonly [Rgba, Rgba, Rgba, Rgba],
  x: number,
  y: number,
  tolerance: number,
): boolean {
  const tx = image.width === 1 ? 0 : x / (image.width - 1);
  const ty = image.height === 1 ? 0 : y / (image.height - 1);
  return maxChannelDiff(image, x, y, backgroundAt(corners, tx, ty)) <= tolerance;
}

function isRowBackground(
  image: RawImage,
  corners: readonly [Rgba, Rgba, Rgba, Rgba],
  y: number,
  tolerance: number,
): boolean {
  for (let x = 0; x < image.width; x += 1) {
    if (!isBackgroundPixel(image, corners, x, y, tolerance)) {
      return false;
    }
  }
  return true;
}

function isColumnBackground(
  image: RawImage,
  corners: readonly [Rgba, Rgba, Rgba, Rgba],
  x: number,
  tolerance: number,
): boolean {
  for (let y = 0; y < image.height; y += 1) {
    if (!isBackgroundPixel(image, corners, x, y, tolerance)) {
      return false;
    }
  }
  return true;
}

/**
 * Finds the content bounding box by scanning inward from each edge past
 * background-colored rows/columns, then re-expands it by `padding`. If no
 * content is found (the whole image reads as background), the full image
 * is returned unchanged rather than an empty box — an all-background image
 * has nothing to safely crop to.
 */
export function autoTrim(image: RawImage, options: AutoTrimOptions = {}): PixelBox {
  assertValidImage(image);
  const tolerance = options.tolerance ?? 16;
  const padding = options.padding ?? 6;
  const patchRadius = Math.min(2, Math.floor(Math.min(image.width, image.height) / 2));

  const corners: readonly [Rgba, Rgba, Rgba, Rgba] = [
    samplePatch(image, 0, 0, patchRadius),
    samplePatch(image, image.width - 1, 0, patchRadius),
    samplePatch(image, 0, image.height - 1, patchRadius),
    samplePatch(image, image.width - 1, image.height - 1, patchRadius),
  ];

  let top = 0;
  while (top < image.height && isRowBackground(image, corners, top, tolerance)) {
    top += 1;
  }

  if (top === image.height) {
    return { x: 0, y: 0, width: image.width, height: image.height };
  }

  let bottom = image.height - 1;
  while (bottom > top && isRowBackground(image, corners, bottom, tolerance)) {
    bottom -= 1;
  }

  let left = 0;
  while (left < image.width && isColumnBackground(image, corners, left, tolerance)) {
    left += 1;
  }

  let right = image.width - 1;
  while (right > left && isColumnBackground(image, corners, right, tolerance)) {
    right -= 1;
  }

  const x = Math.max(0, left - padding);
  const y = Math.max(0, top - padding);
  const right2 = Math.min(image.width - 1, right + padding);
  const bottom2 = Math.min(image.height - 1, bottom + padding);

  return { x, y, width: right2 - x + 1, height: bottom2 - y + 1 };
}
