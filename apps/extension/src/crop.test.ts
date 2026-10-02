import { describe, expect, it } from 'vitest';

import {
  calculateSourceCoordinates,
  normalizeCropRect,
  validateCropRect,
} from './crop';

describe('normalizeCropRect', () => {
  it('handles standard top-left to bottom-right dragging', () => {
    const rect = normalizeCropRect({
      startX: 10,
      startY: 20,
      endX: 110,
      endY: 120,
      dpr: 1,
      viewportWidth: 1000,
      viewportHeight: 800,
    });

    expect(rect).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 100,
      dpr: 1,
    });
  });

  it('handles reverse bottom-right to top-left dragging', () => {
    const rect = normalizeCropRect({
      startX: 250,
      startY: 300,
      endX: 150,
      endY: 200,
      dpr: 2,
      viewportWidth: 1000,
      viewportHeight: 800,
    });

    expect(rect).toEqual({
      x: 150,
      y: 200,
      width: 100,
      height: 100,
      dpr: 2,
    });
  });

  it('clamps coordinates to viewport boundary when dragging past viewport', () => {
    const rect = normalizeCropRect({
      startX: 950,
      startY: 750,
      endX: 1200,
      endY: 900,
      dpr: 1,
      viewportWidth: 1000,
      viewportHeight: 800,
    });

    expect(rect).toEqual({
      x: 950,
      y: 750,
      width: 50,
      height: 50,
      dpr: 1,
    });
  });

  it('clamps negative coordinates to 0', () => {
    const rect = normalizeCropRect({
      startX: -50,
      startY: -20,
      endX: 100,
      endY: 100,
      dpr: 1,
    });

    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
  });
});

describe('validateCropRect', () => {
  it('accepts sufficiently large rectangles', () => {
    const res = validateCropRect({ x: 10, y: 10, width: 100, height: 80 });
    expect(res.valid).toBe(true);
  });

  it('rejects zero or negative area', () => {
    const res = validateCropRect({ x: 10, y: 10, width: 0, height: 50 });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('zero_area');
  });

  it('rejects sub-threshold accidental clicks', () => {
    const res = validateCropRect({ x: 10, y: 10, width: 4, height: 4 }, 10);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('too_small');
  });
});

describe('calculateSourceCoordinates', () => {
  it('correctly maps 1:1 scale', () => {
    const coords = calculateSourceCoordinates(
      { x: 50, y: 100, width: 200, height: 150 },
      1920,
      1080,
      1920,
      1080,
    );

    expect(coords).toEqual({
      sx: 50,
      sy: 100,
      sWidth: 200,
      sHeight: 150,
    });
  });

  it('correctly scales 2x retina coordinates', () => {
    const coords = calculateSourceCoordinates(
      { x: 50, y: 100, width: 200, height: 150 },
      2000,
      1600,
      1000,
      800,
    );

    expect(coords).toEqual({
      sx: 100,
      sy: 200,
      sWidth: 400,
      sHeight: 300,
    });
  });

  it('clamps bounds to avoid screenshot overflow', () => {
    const coords = calculateSourceCoordinates(
      { x: 900, y: 700, width: 200, height: 200 },
      1000,
      800,
      1000,
      800,
    );

    expect(coords.sx).toBe(900);
    expect(coords.sy).toBe(700);
    expect(coords.sWidth).toBe(100);
    expect(coords.sHeight).toBe(100);
  });
});
