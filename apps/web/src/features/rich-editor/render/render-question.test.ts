import { describe, expect, it } from 'vitest';

import { mmToPx } from './render-question';

describe('mmToPx', () => {
  it('converts a full test column width at draft DPI (120)', () => {
    // docs/02 §5.2: an A4 column minus margins is roughly 170mm wide.
    expect(mmToPx(170, 120)).toBe(Math.ceil((170 * 120) / 25.4));
  });

  it('rounds up so content never clips at high DPI (300)', () => {
    expect(mmToPx(1, 300)).toBe(Math.ceil(300 / 25.4));
    expect(Number.isInteger(mmToPx(33.3, 300))).toBe(true);
  });

  it('scales linearly with DPI for the same width', () => {
    const at120 = mmToPx(100, 120);
    const at300 = mmToPx(100, 300);
    expect(at300).toBeGreaterThan(at120 * 2);
  });
});
