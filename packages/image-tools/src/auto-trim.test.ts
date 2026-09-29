import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { autoTrim } from './auto-trim';
import { createSolidImage, paintRect } from './raw-image';

import type { PixelBox } from './raw-image';

const WHITE: readonly [number, number, number, number] = [255, 255, 255, 255];
const BLACK: readonly [number, number, number, number] = [0, 0, 0, 255];

describe('autoTrim', () => {
  it('returns the full image when nothing but background is present', () => {
    const image = createSolidImage(40, 30, WHITE);
    expect(autoTrim(image)).toEqual({ x: 0, y: 0, width: 40, height: 30 });
  });

  it('finds a centered content rectangle within tolerance and padding', () => {
    const image = paintRect(
      createSolidImage(60, 60, WHITE),
      { x: 20, y: 25, width: 10, height: 8 },
      BLACK,
    );
    const box = autoTrim(image, { tolerance: 16, padding: 6 });

    // The rectangle plus 6px padding on each side, clamped to the image.
    expect(box).toEqual({ x: 14, y: 19, width: 22, height: 20 });
  });

  it('clamps padding at the image edge when content touches a border', () => {
    const image = paintRect(
      createSolidImage(40, 40, WHITE),
      { x: 0, y: 0, width: 5, height: 5 },
      BLACK,
    );
    const box = autoTrim(image, { padding: 6 });

    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
  });

  it('is not fooled by a diagonal gradient background', () => {
    const width = 50;
    const height = 50;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const t = (x + y) / (width + height - 2);
        const shade = Math.round(200 + t * 40); // 200 -> 240, a gentle gradient
        const i = (y * width + x) * 4;
        data[i] = shade;
        data[i + 1] = shade;
        data[i + 2] = shade;
        data[i + 3] = 255;
      }
    }
    const gradient = { width, height, data };
    const image = paintRect(gradient, { x: 20, y: 20, width: 10, height: 10 }, BLACK);

    const box = autoTrim(image, { tolerance: 10, padding: 4 });

    expect(box.x).toBeLessThanOrEqual(20);
    expect(box.y).toBeLessThanOrEqual(20);
    expect(box.x + box.width).toBeGreaterThanOrEqual(30);
    expect(box.y + box.height).toBeGreaterThanOrEqual(30);
    // And it shouldn't have fallen back to "no content found".
    expect(box).not.toEqual({ x: 0, y: 0, width, height });
  });

  it('never returns a box larger than the source image', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 80 }),
        fc.integer({ min: 10, max: 80 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 2, max: 20 }),
        (width, height, rectX, rectY, rectW, rectH) => {
          const box: PixelBox = {
            x: Math.min(rectX, width - 1),
            y: Math.min(rectY, height - 1),
            width: Math.min(rectW, width),
            height: Math.min(rectH, height),
          };
          const image = paintRect(createSolidImage(width, height, WHITE), box, BLACK);
          const result = autoTrim(image);

          expect(result.x).toBeGreaterThanOrEqual(0);
          expect(result.y).toBeGreaterThanOrEqual(0);
          expect(result.x + result.width).toBeLessThanOrEqual(width);
          expect(result.y + result.height).toBeLessThanOrEqual(height);
        },
      ),
    );
  });
});
