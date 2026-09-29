import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { bubbleGrid, type BubbleGridSpec } from './geometry';

const specArb = fc.record<BubbleGridSpec>({
  rows: fc.integer({ min: 0, max: 30 }),
  columns: fc.integer({ min: 0, max: 8 }),
  originX: fc.double({ min: 0, max: 200, noNaN: true }),
  originY: fc.double({ min: 0, max: 280, noNaN: true }),
  pitchX: fc.double({ min: 1, max: 20, noNaN: true }),
  pitchY: fc.double({ min: 1, max: 20, noNaN: true }),
  diameter: fc.double({ min: 1, max: 8, noNaN: true }),
});

describe('bubbleGrid', () => {
  it('produces exactly rows times columns cells', () => {
    fc.assert(
      fc.property(specArb, (spec) => {
        expect(bubbleGrid(spec)).toHaveLength(spec.rows * spec.columns);
      }),
    );
  });

  it('keeps every cell inside the grid bounds', () => {
    fc.assert(
      fc.property(specArb, (spec) => {
        const maxX = spec.originX + Math.max(0, spec.columns - 1) * spec.pitchX;
        const maxY = spec.originY + Math.max(0, spec.rows - 1) * spec.pitchY;

        for (const cell of bubbleGrid(spec)) {
          expect(cell.x).toBeGreaterThanOrEqual(spec.originX);
          expect(cell.x).toBeLessThanOrEqual(maxX);
          expect(cell.y).toBeGreaterThanOrEqual(spec.originY);
          expect(cell.y).toBeLessThanOrEqual(maxY);
        }
      }),
    );
  });

  it('rejects fractional counts', () => {
    expect(() =>
      bubbleGrid({
        rows: 1.5,
        columns: 5,
        originX: 0,
        originY: 0,
        pitchX: 6,
        pitchY: 6,
        diameter: 4,
      }),
    ).toThrow(RangeError);
  });
});
