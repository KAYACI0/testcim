import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { applyHomography, solveHomography, type Point } from './homography';

const TEMPLATE_CORNERS: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
  { x: 0, y: 280 },
  { x: 200, y: 280 },
];

function rotatedRectangleCorners(
  width: number,
  height: number,
  angleRad: number,
  tx: number,
  ty: number,
): Point[] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ];
  return corners.map(({ x, y }) => ({ x: x * cos - y * sin + tx, y: x * sin + y * cos + ty }));
}

describe('solveHomography / applyHomography', () => {
  it('maps every source corner exactly onto its destination corner (pure rotation + scale + translation)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 300, max: 3000, noNaN: true }),
        fc.double({ min: 300, max: 3000, noNaN: true }),
        fc.double({ min: -0.3, max: 0.3, noNaN: true }),
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: -500, max: 500, noNaN: true }),
        (width, height, angle, tx, ty) => {
          const destination = rotatedRectangleCorners(width, height, angle, tx, ty);
          const h = solveHomography(TEMPLATE_CORNERS, destination);

          for (let i = 0; i < 4; i += 1) {
            const mapped = applyHomography(h, TEMPLATE_CORNERS[i]!);
            expect(mapped.x).toBeCloseTo(destination[i]!.x, 3);
            expect(mapped.y).toBeCloseTo(destination[i]!.y, 3);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is the identity when source equals destination', () => {
    const h = solveHomography(TEMPLATE_CORNERS, TEMPLATE_CORNERS);
    for (const point of TEMPLATE_CORNERS) {
      const mapped = applyHomography(h, point);
      expect(mapped.x).toBeCloseTo(point.x, 6);
      expect(mapped.y).toBeCloseTo(point.y, 6);
    }
    const interior = applyHomography(h, { x: 100, y: 140 });
    expect(interior.x).toBeCloseTo(100, 6);
    expect(interior.y).toBeCloseTo(140, 6);
  });

  it('interpolates an interior point consistently with a known perspective warp', () => {
    // A trapezoid destination (true perspective, not just affine) — the centre of the
    // source square should land inside the trapezoid, closer to the narrow (right) edge
    // than a naive average would place it, which is the signature of a real homography.
    const destination: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 20 },
      { x: 0, y: 200 },
      { x: 100, y: 180 },
    ];
    const h = solveHomography(TEMPLATE_CORNERS, destination);
    const center = applyHomography(h, { x: 100, y: 140 });
    expect(center.x).toBeGreaterThan(0);
    expect(center.x).toBeLessThan(100);
    expect(center.y).toBeGreaterThan(0);
    expect(center.y).toBeLessThan(200);
  });

  it('rejects degenerate (collinear) correspondences', () => {
    const collinear: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    expect(() => solveHomography(TEMPLATE_CORNERS, collinear)).toThrow(RangeError);
  });
});
