import type { PaintColor } from './paint-types';

/**
 * The paper palette as 0-255 RGB numbers, for the PDF. These repeat the colour tokens in
 * apps/web/src/styles/tokens.css (the only place hex values may live); a test in this
 * package reads that file and fails if either side changes alone.
 */
export const PAINT_RGB: Readonly<Record<PaintColor, readonly [number, number, number]>> = {
  surface: [255, 255, 255],
  ink: [28, 34, 48],
  ink2: [85, 96, 112],
  ink3: [107, 118, 134],
  line: [229, 232, 237],
  lineStrong: [205, 211, 220],
  accent: [35, 64, 143],
};

/** The CSS variable each token maps to in the HTML preview. */
export const PAINT_CSS_VAR: Readonly<Record<PaintColor, string>> = {
  surface: 'var(--color-surface)',
  ink: 'var(--color-ink)',
  ink2: 'var(--color-ink-2)',
  ink3: 'var(--color-ink-3)',
  line: 'var(--color-line)',
  lineStrong: 'var(--color-line-strong)',
  accent: 'var(--color-accent)',
};
