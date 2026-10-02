import type { RawImage } from './raw-image';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type Quad = readonly [Point, Point, Point, Point];

export type Matrix3x3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * Returns a default quadrilateral inset by insetRatio from image edges.
 * Order: top-left, top-right, bottom-right, bottom-left.
 */
export function detectDefaultQuad(width: number, height: number, insetRatio = 0.05): Quad {
  const dx = Math.round(width * insetRatio);
  const dy = Math.round(height * insetRatio);
  return [
    { x: dx, y: dy },
    { x: width - dx, y: dy },
    { x: width - dx, y: height - dy },
    { x: dx, y: height - dy },
  ];
}

/**
 * Computes the 3x3 homography matrix mapping points from source quadrilateral
 * to destination quadrilateral using Gaussian elimination on 8 equations.
 */
export function solveHomography(from: readonly Point[], to: readonly Point[]): Matrix3x3 {
  if (from.length < 4 || to.length < 4) {
    throw new Error('Homography requires at least 4 point correspondences');
  }

  // 8x8 system for h00..h21 with h22 = 1
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const p1 = from[i]!;
    const p2 = to[i]!;

    A.push([p1.x, p1.y, 1, 0, 0, 0, -p1.x * p2.x, -p1.y * p2.x]);
    b.push(p2.x);

    A.push([0, 0, 0, p1.x, p1.y, 1, -p1.x * p2.y, -p1.y * p2.y]);
    b.push(p2.y);
  }

  // Gaussian elimination with partial pivoting
  const n = 8;
  for (let i = 0; i < n; i += 1) {
    let maxRow = i;
    for (let k = i + 1; k < n; k += 1) {
      if (Math.abs(A[k]![i]!) > Math.abs(A[maxRow]![i]!)) {
        maxRow = k;
      }
    }

    const tempA = A[i]!;
    A[i] = A[maxRow]!;
    A[maxRow] = tempA;

    const tempB = b[i]!;
    b[i] = b[maxRow]!;
    b[maxRow] = tempB;

    const pivot = A[i]![i]!;
    if (Math.abs(pivot) < 1e-12) {
      continue;
    }

    for (let j = i; j < n; j += 1) {
      A[i]![j] = A[i]![j]! / pivot;
    }
    b[i] = b[i]! / pivot;

    for (let k = 0; k < n; k += 1) {
      if (k !== i) {
        const factor = A[k]![i]!;
        for (let j = i; j < n; j += 1) {
          A[k]![j] = A[k]![j]! - factor * A[i]![j]!;
        }
        b[k] = b[k]! - factor * b[i]!;
      }
    }
  }

  return [b[0]!, b[1]!, b[2]!, b[3]!, b[4]!, b[5]!, b[6]!, b[7]!, 1];
}

/**
 * Applies a 3x3 homography matrix to a 2D point.
 */
export function applyHomography(h: Matrix3x3, p: Point): Point {
  const denom = h[6] * p.x + h[7] * p.y + h[8];
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / denom,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / denom,
  };
}

/**
 * Warps quadrilateral region in source image to a target rectangular RawImage
 * using inverse perspective mapping with bilinear interpolation.
 */
export function warpQuad(
  image: RawImage,
  quad: Quad,
  targetWidth: number,
  targetHeight: number,
): RawImage {
  const { width: srcW, height: srcH, data: srcData } = image;
  const dstData = new Uint8ClampedArray(targetWidth * targetHeight * 4);

  // Map destination rectangle -> source quadrilateral
  const targetCorners: Point[] = [
    { x: 0, y: 0 },
    { x: targetWidth, y: 0 },
    { x: targetWidth, y: targetHeight },
    { x: 0, y: targetHeight },
  ];

  const h = solveHomography(targetCorners, quad);

  for (let dy = 0; dy < targetHeight; dy += 1) {
    for (let dx = 0; dx < targetWidth; dx += 1) {
      const srcPt = applyHomography(h, { x: dx, y: dy });
      const sx = srcPt.x;
      const sy = srcPt.y;

      const dstIdx = (dy * targetWidth + dx) * 4;

      if (sx < 0 || sx >= srcW - 1 || sy < 0 || sy >= srcH - 1) {
        const cx = Math.max(0, Math.min(srcW - 1, Math.round(sx)));
        const cy = Math.max(0, Math.min(srcH - 1, Math.round(sy)));
        const srcIdx = (cy * srcW + cx) * 4;
        dstData[dstIdx] = srcData[srcIdx]!;
        dstData[dstIdx + 1] = srcData[srcIdx + 1]!;
        dstData[dstIdx + 2] = srcData[srcIdx + 2]!;
        dstData[dstIdx + 3] = srcData[srcIdx + 3]!;
      } else {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const wx = sx - x0;
        const wy = sy - y0;

        const i00 = (y0 * srcW + x0) * 4;
        const i10 = (y0 * srcW + x1) * 4;
        const i01 = (y1 * srcW + x0) * 4;
        const i11 = (y1 * srcW + x1) * 4;

        for (let c = 0; c < 4; c += 1) {
          const top = srcData[i00 + c]! * (1 - wx) + srcData[i10 + c]! * wx;
          const btm = srcData[i01 + c]! * (1 - wx) + srcData[i11 + c]! * wx;
          dstData[dstIdx + c] = Math.round(top * (1 - wy) + btm * wy);
        }
      }
    }
  }

  return { width: targetWidth, height: targetHeight, data: dstData };
}

/**
 * Rotates a RawImage by 90, 180, or 270 degrees clockwise.
 */
export function rotateRawImage(image: RawImage, degrees: 90 | 180 | 270): RawImage {
  const { width: srcW, height: srcH, data: srcData } = image;
  const isQuarter = degrees === 90 || degrees === 270;
  const dstW = isQuarter ? srcH : srcW;
  const dstH = isQuarter ? srcW : srcH;
  const dstData = new Uint8ClampedArray(dstW * dstH * 4);

  for (let sy = 0; sy < srcH; sy += 1) {
    for (let sx = 0; sx < srcW; sx += 1) {
      let dx = sx;
      let dy = sy;

      if (degrees === 90) {
        dx = srcH - 1 - sy;
        dy = sx;
      } else if (degrees === 180) {
        dx = srcW - 1 - sx;
        dy = srcH - 1 - sy;
      } else if (degrees === 270) {
        dx = sy;
        dy = srcW - 1 - sx;
      }

      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (dy * dstW + dx) * 4;

      dstData[dstIdx] = srcData[srcIdx]!;
      dstData[dstIdx + 1] = srcData[srcIdx + 1]!;
      dstData[dstIdx + 2] = srcData[srcIdx + 2]!;
      dstData[dstIdx + 3] = srcData[srcIdx + 3]!;
    }
  }

  return { width: dstW, height: dstH, data: dstData };
}
