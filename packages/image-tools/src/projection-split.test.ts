import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { splitByProjection } from './projection-split';
import { createSolidImage, paintRect } from './raw-image';

const WHITE: readonly [number, number, number, number] = [255, 255, 255, 255];
const BLACK: readonly [number, number, number, number] = [0, 0, 0, 255];

describe('splitByProjection', () => {
  it('returns nothing for a blank page', () => {
    const image = createSolidImage(100, 100, WHITE);
    expect(splitByProjection(image)).toEqual([]);
  });

  it('splits two vertically stacked blocks separated by whitespace', () => {
    let image = createSolidImage(100, 200, WHITE);
    image = paintRect(image, { x: 10, y: 10, width: 80, height: 30 }, BLACK);
    image = paintRect(image, { x: 10, y: 100, width: 80, height: 30 }, BLACK);

    const blocks = splitByProjection(image);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.y).toBeLessThan(blocks[1]!.y);
    expect(blocks[0]!.y + blocks[0]!.height).toBeLessThan(blocks[1]!.y);
  });

  it('splits two side-by-side columns separated by a wide gap', () => {
    let image = createSolidImage(200, 100, WHITE);
    image = paintRect(image, { x: 5, y: 10, width: 60, height: 60 }, BLACK);
    image = paintRect(image, { x: 135, y: 10, width: 60, height: 60 }, BLACK);

    const blocks = splitByProjection(image);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.x).toBeLessThan(blocks[1]!.x);
  });

  it('merges two blocks whose gap is narrower than the block-gap threshold', () => {
    let image = createSolidImage(100, 100, WHITE);
    image = paintRect(image, { x: 10, y: 10, width: 80, height: 20 }, BLACK);
    // 1px gap: well under the default 2% block-gap-fraction (2px on a 100px image).
    image = paintRect(image, { x: 10, y: 31, width: 80, height: 20 }, BLACK);

    const blocks = splitByProjection(image);

    expect(blocks).toHaveLength(1);
  });

  it('never returns a box outside the source image bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 120 }),
        fc.integer({ min: 30, max: 120 }),
        fc.integer({ min: 1, max: 4 }),
        (width, height, blockCount) => {
          let image = createSolidImage(width, height, WHITE);
          const blockHeight = Math.max(2, Math.floor(height / (blockCount * 2)));
          for (let i = 0; i < blockCount; i += 1) {
            const y = Math.min(height - blockHeight - 1, i * blockHeight * 2 + 2);
            image = paintRect(
              image,
              { x: 2, y: Math.max(0, y), width: Math.max(2, width - 4), height: blockHeight },
              BLACK,
            );
          }

          const blocks = splitByProjection(image);

          for (const block of blocks) {
            expect(block.x).toBeGreaterThanOrEqual(0);
            expect(block.y).toBeGreaterThanOrEqual(0);
            expect(block.x + block.width).toBeLessThanOrEqual(width);
            expect(block.y + block.height).toBeLessThanOrEqual(height);
          }
        },
      ),
    );
  });
});
