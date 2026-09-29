import { describe, expect, it } from 'vitest';

import { contrastRatio, meetsAA } from './color-contrast';

/**
 * Hex values mirrored from apps/web/src/styles/tokens.css (docs/03 section 2). The
 * design rule scanner forbids hex literals outside the token file itself, so this test
 * carries a `design-allow` escape hatch for the one purpose that legitimately needs them:
 * verifying the tokens meet WCAG AA.
 */
const TOKENS = {
  surface: '#FFFFFF', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  canvas: '#F5F6F8', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  ink: '#1C2230', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  ink2: '#556070', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  ink3: '#6B7686', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  accent: '#23408F', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  accentTint: '#EEF1FA', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  ok: '#1D7A4B', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  err: '#B4322A', // design-allow: hex-color -- mirrors tokens.css for a contrast test
  warn: '#9A6100', // design-allow: hex-color -- mirrors tokens.css for a contrast test
} as const;

describe('token contrast (docs/03 section 2, AA)', () => {
  it.each([
    ['ink on surface (body text)', TOKENS.ink, TOKENS.surface],
    ['ink-2 on surface (secondary text)', TOKENS.ink2, TOKENS.surface],
    ['ink-3 on surface (placeholder text)', TOKENS.ink3, TOKENS.surface],
    ['ink on canvas (editor labels)', TOKENS.ink, TOKENS.canvas],
    ['ink-2 on canvas', TOKENS.ink2, TOKENS.canvas],
    ['accent on surface (links, focus text)', TOKENS.accent, TOKENS.surface],
    ['surface on accent (primary button text)', TOKENS.surface, TOKENS.accent],
    ['ink on accent-tint (selected row text)', TOKENS.ink, TOKENS.accentTint],
    ['ok on surface (correct-answer text)', TOKENS.ok, TOKENS.surface],
    ['err on surface (error text)', TOKENS.err, TOKENS.surface],
    ['warn on surface (warning text)', TOKENS.warn, TOKENS.surface],
  ])('%s reaches 4.5:1', (_label, fg, bg) => {
    expect(meetsAA(fg, bg, 'normal')).toBe(true);
  });

  it('ink-3 on surface is the tightest pairing and still clears AA', () => {
    expect(contrastRatio(TOKENS.ink3, TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
