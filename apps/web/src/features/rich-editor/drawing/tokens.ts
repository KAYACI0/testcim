/**
 * Resolves the drawing tool's colors from the design token layer
 * (apps/web/src/styles/tokens.css) at draw time, rather than hardcoding hex
 * values here — Konva/SVG take raw color strings, not Tailwind classes, but
 * docs/03 still requires every color to trace back to the one token file
 * (`pnpm check:design`'s `hex-color` rule enforces this).
 */
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function strokeColor(): string {
  return cssVar('--color-ink', 'black');
}

export function gridLineColor(): string {
  return cssVar('--color-line', 'gainsboro');
}

export function selectedColor(): string {
  return cssVar('--color-accent', 'blue');
}

export function canvasBackgroundColor(): string {
  return cssVar('--color-surface', 'white');
}
