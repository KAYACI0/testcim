export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function hexToRgb(hex: string): RgbColor {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) {
    throw new RangeError(`"${hex}" is not a 6-digit hex colour.`);
  }
  const value = match[1] as string;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function toLinear(channel: number): number {
  const normalised = channel / 255;
  return normalised <= 0.03928 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: RgbColor): number {
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two colours, always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const lumA = relativeLuminance(hexToRgb(a));
  const lumB = relativeLuminance(hexToRgb(b));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** AA thresholds: 4.5:1 for normal text, 3:1 for large text (18px+/14px bold) or UI components. */
export function meetsAA(a: string, b: string, size: 'normal' | 'large' = 'normal'): boolean {
  const threshold = size === 'large' ? 3 : 4.5;
  return contrastRatio(a, b) >= threshold;
}
