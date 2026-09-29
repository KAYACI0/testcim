/**
 * The engine works in millimetres. Values are rounded to a fixed precision so that
 * preview, PDF, DOCX and PPTX derived from the same LayoutDocument agree exactly.
 */
export const MM_PRECISION = 3;

const FACTOR = 10 ** MM_PRECISION;

/** Rounds a millimetre value to the engine precision. */
export function mm(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError('Millimetre values must be finite.');
  }

  return Math.round(value * FACTOR) / FACTOR;
}

/** Adds millimetre values, rounding once at the end. */
export function mmAdd(...values: readonly number[]): number {
  return mm(values.reduce((total, value) => total + value, 0));
}
