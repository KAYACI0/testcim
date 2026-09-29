import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { clampDimensions } from './dimensions';

const sizeArb = fc.record({
  width: fc.integer({ min: 1, max: 12000 }),
  height: fc.integer({ min: 1, max: 12000 }),
});
const maxSideArb = fc.integer({ min: 1, max: 4000 });

describe('clampDimensions', () => {
  it('never returns a side longer than the limit', () => {
    fc.assert(
      fc.property(sizeArb, maxSideArb, (size, maxSide) => {
        const clamped = clampDimensions(size, maxSide);
        expect(Math.max(clamped.width, clamped.height)).toBeLessThanOrEqual(maxSide);
      }),
    );
  });

  it('keeps sizes that already fit', () => {
    fc.assert(
      fc.property(sizeArb, (size) => {
        const maxSide = Math.max(size.width, size.height);
        expect(clampDimensions(size, maxSide)).toEqual(size);
      }),
    );
  });

  it('stays within a pixel of the ideally scaled size', () => {
    // The aspect ratio cannot be held exactly: sides are integers and never drop below 1.
    // What does hold is that each side is within one pixel of the ideal scaled value.
    fc.assert(
      fc.property(sizeArb, maxSideArb, (size, maxSide) => {
        const scale = Math.min(1, maxSide / Math.max(size.width, size.height));
        const clamped = clampDimensions(size, maxSide);

        expect(Math.abs(clamped.width - size.width * scale)).toBeLessThanOrEqual(1);
        expect(Math.abs(clamped.height - size.height * scale)).toBeLessThanOrEqual(1);
      }),
    );
  });

  it('makes the longest side exactly the limit when downscaling', () => {
    fc.assert(
      fc.property(sizeArb, maxSideArb, (size, maxSide) => {
        if (Math.max(size.width, size.height) <= maxSide) {
          return;
        }

        const clamped = clampDimensions(size, maxSide);
        expect(Math.max(clamped.width, clamped.height)).toBe(maxSide);
      }),
    );
  });

  it('rejects impossible input', () => {
    expect(() => clampDimensions({ width: 0, height: 10 }, 100)).toThrow(RangeError);
    expect(() => clampDimensions({ width: 10.5, height: 10 }, 100)).toThrow(RangeError);
    expect(() => clampDimensions({ width: 10, height: 10 }, 0)).toThrow(RangeError);
  });
});
