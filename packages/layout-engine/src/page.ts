import type { PageOrientation, PageSize } from './types';

const PORTRAIT_MM: Readonly<Record<Exclude<PageSize, 'custom'>, readonly [number, number]>> = {
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  Letter: [215.9, 279.4],
};

/** Page dimensions in millimetres, after orientation. */
export function pageDimensions(
  size: PageSize,
  orientation: PageOrientation,
  custom?: { readonly widthMm?: number | undefined; readonly heightMm?: number | undefined },
): { readonly widthMm: number; readonly heightMm: number } {
  let width: number;
  let height: number;

  if (size === 'custom') {
    if (!custom?.widthMm || !custom.heightMm || custom.widthMm <= 0 || custom.heightMm <= 0) {
      throw new RangeError('A custom page size needs a positive width and height.');
    }
    width = custom.widthMm;
    height = custom.heightMm;
  } else {
    [width, height] = PORTRAIT_MM[size];
  }

  return orientation === 'landscape'
    ? { widthMm: Math.max(width, height), heightMm: Math.min(width, height) }
    : { widthMm: Math.min(width, height), heightMm: Math.max(width, height) };
}
