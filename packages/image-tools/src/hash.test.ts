import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { hammingDistance, pHash, sha256 } from './hash';
import { createSolidImage, paintRect } from './raw-image';

const hexCharArb = fc.constantFrom(...'0123456789abcdef'.split(''));
const hexHashArb = fc
  .array(hexCharArb, { minLength: 16, maxLength: 16 })
  .map((chars) => chars.join(''));

describe('sha256', () => {
  it('matches a known test vector for the empty input', async () => {
    expect(await sha256(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('is deterministic', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    expect(await sha256(bytes)).toBe(await sha256(bytes));
  });

  it('differs for different input', async () => {
    const a = await sha256(new Uint8Array([1, 2, 3]));
    const b = await sha256(new Uint8Array([1, 2, 4]));
    expect(a).not.toBe(b);
  });
});

describe('pHash', () => {
  it('is deterministic for the same image', () => {
    const image = createSolidImage(64, 64, [10, 20, 30, 255]);
    expect(pHash(image)).toBe(pHash(image));
  });

  it('produces a 16-char hex string', () => {
    const hash = pHash(createSolidImage(64, 64));
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is close for near-identical images and far for unrelated ones', () => {
    const base = paintRect(
      createSolidImage(64, 64, [255, 255, 255, 255]),
      { x: 10, y: 10, width: 20, height: 20 },
      [0, 0, 0, 255],
    );
    const slightlyShifted = paintRect(
      createSolidImage(64, 64, [255, 255, 255, 255]),
      { x: 11, y: 10, width: 20, height: 20 },
      [0, 0, 0, 255],
    );
    const unrelated = paintRect(
      createSolidImage(64, 64, [0, 0, 0, 255]),
      { x: 40, y: 5, width: 5, height: 50 },
      [255, 255, 255, 255],
    );

    const nearDistance = hammingDistance(pHash(base), pHash(slightlyShifted));
    const farDistance = hammingDistance(pHash(base), pHash(unrelated));

    expect(nearDistance).toBeLessThan(farDistance);
  });
});

describe('hammingDistance', () => {
  it('is zero for identical hashes', () => {
    fc.assert(
      fc.property(hexHashArb, (hash) => {
        expect(hammingDistance(hash, hash)).toBe(0);
      }),
    );
  });

  it('is symmetric', () => {
    fc.assert(
      fc.property(hexHashArb, hexHashArb, (a, b) => {
        expect(hammingDistance(a, b)).toBe(hammingDistance(b, a));
      }),
    );
  });

  it('rejects mismatched lengths', () => {
    expect(() => hammingDistance('ab', 'abcd')).toThrow(RangeError);
  });
});
