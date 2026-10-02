import { describe, expect, it } from 'vitest';

import {
  applyHomography,
  detectDefaultQuad,
  rotateRawImage,
  solveHomography,
  warpQuad,
  type Point,
  type Quad,
} from './perspective';
import { createSolidImage, paintRect, type RawImage } from './raw-image';

describe('homography mapping', () => {
  it('maps unit square identity correctly', () => {
    const square: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const h = solveHomography(square, square);
    for (const pt of square) {
      const mapped = applyHomography(h, pt);
      expect(Math.round(mapped.x)).toBe(pt.x);
      expect(Math.round(mapped.y)).toBe(pt.y);
    }
  });

  it('translates and scales points correctly', () => {
    const from: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const to: Point[] = [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 150 },
      { x: 50, y: 150 },
    ];
    const h = solveHomography(from, to);
    for (let i = 0; i < 4; i += 1) {
      const mapped = applyHomography(h, from[i]!);
      expect(Math.round(mapped.x)).toBe(to[i]!.x);
      expect(Math.round(mapped.y)).toBe(to[i]!.y);
    }
  });
});

describe('detectDefaultQuad', () => {
  it('returns inset quadrilateral', () => {
    const quad = detectDefaultQuad(1000, 500, 0.05);
    expect(quad).toEqual([
      { x: 50, y: 25 },
      { x: 950, y: 25 },
      { x: 950, y: 475 },
      { x: 50, y: 475 },
    ]);
  });
});

describe('warpQuad and rotateRawImage', () => {
  it('warps an axis-aligned subrectangle without distortion', () => {
    // 200x200 image, red square inside (50..150, 50..150)
    let img: RawImage = createSolidImage(200, 200, [255, 255, 255, 255]);
    img = paintRect(img, { x: 50, y: 50, width: 100, height: 100 }, [200, 0, 0, 255]);

    const quad: Quad = [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 150 },
      { x: 50, y: 150 },
    ];

    const warped = warpQuad(img, quad, 100, 100);
    expect(warped.width).toBe(100);
    expect(warped.height).toBe(100);

    // Center pixel should be red
    const centerIdx = (50 * 100 + 50) * 4;
    expect(warped.data[centerIdx]).toBe(200);
    expect(warped.data[centerIdx + 1]).toBe(0);
  });

  it('rotates image 90 degrees clockwise', () => {
    // 100x50 image with top-left dot
    let img: RawImage = createSolidImage(100, 50, [255, 255, 255, 255]);
    img = paintRect(img, { x: 0, y: 0, width: 10, height: 10 }, [10, 20, 30, 255]);

    const rot90 = rotateRawImage(img, 90);
    expect(rot90.width).toBe(50);
    expect(rot90.height).toBe(100);

    // Dot was at top-left (0,0), after 90 deg clockwise it should be at top-right (x=45, y=5)
    const dotIdx = (5 * 50 + 45) * 4;
    expect(rot90.data[dotIdx]).toBe(10);
    expect(rot90.data[dotIdx + 1]).toBe(20);
    expect(rot90.data[dotIdx + 2]).toBe(30);
  });
});
