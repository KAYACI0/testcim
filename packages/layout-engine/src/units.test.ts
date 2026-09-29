import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { MM_PRECISION, mm, mmAdd } from './units';

const finiteMm = fc.double({ min: -1e6, max: 1e6, noNaN: true });

describe('mm', () => {
  it('is idempotent', () => {
    fc.assert(
      fc.property(finiteMm, (value) => {
        expect(mm(mm(value))).toBe(mm(value));
      }),
    );
  });

  it('never drifts more than half a unit of precision', () => {
    const tolerance = 0.5 / 10 ** MM_PRECISION;
    fc.assert(
      fc.property(finiteMm, (value) => {
        expect(Math.abs(mm(value) - value)).toBeLessThanOrEqual(tolerance);
      }),
    );
  });

  it('rejects non-finite values', () => {
    expect(() => mm(Number.NaN)).toThrow(RangeError);
    expect(() => mm(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('mmAdd', () => {
  it('matches mm of the raw sum', () => {
    fc.assert(
      fc.property(fc.array(finiteMm, { maxLength: 8 }), (values) => {
        const rawSum = values.reduce((total, value) => total + value, 0);
        expect(mmAdd(...values)).toBe(mm(rawSum));
      }),
    );
  });

  it('returns zero for no values', () => {
    expect(mmAdd()).toBe(0);
  });
});
