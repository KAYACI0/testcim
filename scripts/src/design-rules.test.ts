import { describe, expect, it } from 'vitest';

import { DESIGN_RULES, EMPTY_ALLOWLIST, formatViolations, lintSource } from './design-rules.ts';

const allowlist = {
  ...EMPTY_ALLOWLIST,
  tokenFiles: ['apps/web/src/styles/tokens.css'],
};

function ruleIds(path: string, source: string): string[] {
  return lintSource(path, source, allowlist).map((violation) => violation.ruleId);
}

describe('clean source', () => {
  it('reports nothing for a compliant component', () => {
    const source = [
      "import { getTranslations } from 'next-intl/server';",
      '',
      'export default async function Page() {',
      "  const t = await getTranslations('home');",
      '',
      '  return (',
      '    <main className="rounded-md border border-line bg-surface p-4 text-ink">',
      '      <h1 className="text-[22px] font-semibold">{t(\'title\')}</h1>',
      '    </main>',
      '  );',
      '}',
    ].join('\n');

    expect(ruleIds('apps/web/src/app/page.tsx', source)).toEqual([]);
  });
});

describe('emoji rule', () => {
  it('catches an emoji in a component', () => {
    const violations = lintSource(
      'apps/web/src/app/page.tsx',
      'export const label = "Kaydedildi \u{2705}";',
      allowlist,
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.ruleId).toBe('emoji');
    expect(violations[0]?.line).toBe(1);
  });

  it('catches an emoji in a message bundle', () => {
    expect(ruleIds('apps/web/messages/tr.json', '{ "ok": "Bitti \u{1F389}" }')).toEqual(['emoji']);
  });

  it('catches a flag built from regional indicators', () => {
    expect(ruleIds('apps/web/src/a.tsx', 'const flag = "\u{1F1F9}\u{1F1F7}";')).toEqual([
      'emoji',
      'emoji',
    ]);
  });

  it('allows the copyright and trademark symbols', () => {
    expect(ruleIds('apps/web/src/a.tsx', 'const legal = "© 2026 ™ ®";')).toEqual([]);
  });

  it('allows Turkish characters', () => {
    expect(ruleIds('apps/web/src/a.tsx', 'const s = "ğşıİçöü";')).toEqual([]);
  });
});

describe('gradient rule', () => {
  it('catches a Tailwind gradient utility', () => {
    expect(
      ruleIds('apps/web/src/a.tsx', '<div className="bg-gradient-to-r from-accent" />'),
    ).toEqual(['gradient']);
  });

  it('catches a CSS gradient function', () => {
    expect(
      ruleIds('apps/web/src/a.css', '.hero { background: linear-gradient(red, blue); }'),
    ).toEqual(['gradient']);
  });
});

describe('hex colour rule', () => {
  it('catches a hex value outside the token file', () => {
    expect(ruleIds('apps/web/src/a.tsx', 'const border = "#E5E8ED";')).toEqual(['hex-color']);
  });

  it('allows hex values in the token file', () => {
    expect(ruleIds('apps/web/src/styles/tokens.css', '--color-ink: #1c2230;')).toEqual([]);
  });
});

describe('remaining rules', () => {
  it('catches uppercase transforms', () => {
    expect(ruleIds('apps/web/src/a.tsx', '<span className="uppercase">etiket</span>')).toEqual([
      'uppercase',
    ]);
  });

  it('catches wide tracking', () => {
    expect(ruleIds('apps/web/src/a.tsx', '<span className="tracking-widest" />')).toEqual([
      'wide-tracking',
    ]);
  });

  it('catches large radii', () => {
    expect(ruleIds('apps/web/src/a.tsx', '<div className="rounded-2xl" />')).toEqual([
      'large-radius',
    ]);
    expect(ruleIds('apps/web/src/a.tsx', '<div className="rounded-full" />')).toEqual([
      'large-radius',
    ]);
  });

  it('allows the radii the design system defines', () => {
    expect(ruleIds('apps/web/src/a.tsx', '<div className="rounded-md rounded-sm" />')).toEqual([]);
  });

  it('catches heavy shadows', () => {
    expect(ruleIds('apps/web/src/a.tsx', '<div className="shadow-xl" />')).toEqual([
      'heavy-shadow',
    ]);
  });

  it('catches forbidden icon names', () => {
    expect(
      ruleIds('apps/web/src/a.tsx', "import { Sparkle } from '@phosphor-icons/react';"),
    ).toEqual(['forbidden-icon']);
    expect(ruleIds('apps/web/src/a.tsx', '<MagicWandIcon />')).toEqual(['forbidden-icon']);
  });

  it('allows permitted icon names', () => {
    expect(
      ruleIds('apps/web/src/a.tsx', "import { FilePdf, Printer } from '@phosphor-icons/react';"),
    ).toEqual([]);
  });
});

describe('escape hatches', () => {
  it('honours an inline allowance for that rule only', () => {
    const source = '<div className="rounded-full" /> // design-allow: large-radius -- avatar';

    expect(ruleIds('apps/web/src/a.tsx', source)).toEqual([]);
  });

  it('does not let an inline allowance cover a different rule', () => {
    const source = '<div className="shadow-xl" /> // design-allow: large-radius -- avatar';

    expect(ruleIds('apps/web/src/a.tsx', source)).toEqual(['heavy-shadow']);
  });

  it('honours a file exception from the allowlist', () => {
    const source = '<div className="rounded-full" />';
    const withException = {
      ...allowlist,
      exceptions: [
        { path: 'apps/web/src/avatar.tsx', rules: ['large-radius'], reason: 'Avatar is a circle.' },
      ],
    };

    expect(lintSource('apps/web/src/avatar.tsx', source, withException)).toEqual([]);
    expect(lintSource('apps/web/src/other.tsx', source, withException)).toHaveLength(1);
  });

  it('skips ignored paths entirely', () => {
    const withIgnores = { ...allowlist, ignoredPaths: ['**/*.test.tsx'] };

    expect(lintSource('apps/web/src/a.test.tsx', '"\u{1F389}"', withIgnores)).toEqual([]);
  });
});

describe('reporting', () => {
  it('lists every violation on a multi-rule line', () => {
    const source = '<div className="bg-gradient-to-r shadow-xl uppercase">\u{1F680}</div>';
    const violations = lintSource('apps/web/src/a.tsx', source, allowlist);

    expect(new Set(violations.map((v) => v.ruleId))).toEqual(
      new Set(['gradient', 'heavy-shadow', 'uppercase', 'emoji']),
    );
  });

  it('formats a violation with path, position, rule and excerpt', () => {
    const violations = lintSource('apps/web/src/a.tsx', 'const c = "#FFFFFF";', allowlist);

    expect(formatViolations(violations)).toMatch(
      /^apps\/web\/src\/a\.tsx:1:12 {2}hex-color {2}"#FFFFFF"/,
    );
  });

  it('keeps every rule id unique', () => {
    const ids = DESIGN_RULES.map((rule) => rule.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
