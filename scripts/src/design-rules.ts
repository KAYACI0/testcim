/**
 * Design rule checks from docs/03-tasarim-sistemi.md section 4.
 *
 * The rules live in a pure function so they can be unit tested without touching the disk.
 * The command line wrapper is in check-design-rules.ts.
 */

export interface DesignRule {
  readonly id: string;
  /** Turkish, because the message is read by whoever broke the rule. */
  readonly message: string;
  readonly pattern: RegExp;
  /** File extensions the rule applies to. Empty means every scanned file. */
  readonly extensions?: readonly string[];
}

export interface Violation {
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly ruleId: string;
  readonly message: string;
  readonly excerpt: string;
}

export interface Allowlist {
  /** Files permitted to declare hex colour values. */
  readonly tokenFiles: readonly string[];
  /** Globs (`**` and `*` supported) for files that are skipped entirely. */
  readonly ignoredPaths: readonly string[];
  readonly exceptions: readonly { path: string; rules: readonly string[]; reason: string }[];
}

export const EMPTY_ALLOWLIST: Allowlist = {
  tokenFiles: [],
  ignoredPaths: [],
  exceptions: [],
};

/**
 * Pictographic characters, regional indicators and the variation selector that turns a
 * text glyph into an emoji. The legal typographic symbols (c), (r) and (tm) are excluded.
 */
const EMOJI_PATTERN = /(?![©®™])(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\u{FE0F})/gu;

export const DESIGN_RULES: readonly DesignRule[] = [
  {
    id: 'emoji',
    message: 'Emoji kullanilamaz (docs/03 bolum 4, madde 12).',
    pattern: EMOJI_PATTERN,
  },
  {
    id: 'gradient',
    message: 'Gradyan kullanilamaz (docs/03 bolum 4, madde 1).',
    pattern: /gradient/gi,
  },
  {
    id: 'hex-color',
    message: 'Hex renk yalnizca token dosyasinda yazilir (docs/03 bolum 2).',
    pattern: /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{1,5})?\b/g,
  },
  {
    id: 'uppercase',
    message: 'Buyuk harf donusumu yasak (docs/03 bolum 2, tipografi).',
    pattern: /\buppercase\b/g,
  },
  {
    id: 'wide-tracking',
    message: 'Genis harf araligi yasak (docs/03 bolum 4, madde 3).',
    pattern: /\btracking-(?:wide|wider|widest)\b/g,
  },
  {
    id: 'large-radius',
    message: 'Kose yaricapi hiyerarsiktir; buyuk yaricap yasak (docs/03 bolum 2).',
    pattern: /\brounded-(?:2xl|3xl|full)\b/g,
  },
  {
    id: 'heavy-shadow',
    message: 'Tek golge duzeyi vardir; agir golge yasak (docs/03 bolum 2).',
    pattern: /\bshadow-(?:lg|xl|2xl)\b/g,
  },
  {
    id: 'forbidden-icon',
    message: 'Yasak simge adi (docs/03 bolum 2, ikonlar).',
    pattern: /\b(?:Sparkle|MagicWand|Robot|Brain|Lightbulb|Rocket|Lightning)[A-Za-z]*\b/g,
  },
];

/** An inline escape hatch: `design-allow: rule-id -- reason` on the offending line. */
const INLINE_ALLOW = /design-allow:\s*([a-z-]+)/;

function normalise(path: string): string {
  return path.replace(/\\/g, '/');
}

/** Characters that must be escaped when a glob literal is spliced into a regular expression. */
const REGEXP_SPECIALS = '.+^${}()|[]/';

/** Minimal glob support: `**` crosses directories, `*` and `?` stay within one segment. */
function globToRegExp(glob: string): RegExp {
  const source = normalise(glob);
  let pattern = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index] ?? '';

    if (char === '*' && source[index + 1] === '*') {
      // `**/` matches nothing as well, so `**/*.ts` also matches a file at the root.
      if (source[index + 2] === '/') {
        pattern += '(?:.*/)?';
        index += 3;
      } else {
        pattern += '.*';
        index += 2;
      }
      continue;
    }

    if (char === '*') {
      pattern += '[^/]*';
    } else if (char === '?') {
      pattern += '[^/]';
    } else if (REGEXP_SPECIALS.includes(char)) {
      pattern += `\\${char}`;
    } else {
      pattern += char;
    }

    index += 1;
  }

  return new RegExp(`^${pattern}$`);
}

function isIgnored(path: string, allowlist: Allowlist): boolean {
  const target = normalise(path);

  return allowlist.ignoredPaths.some((entry) => globToRegExp(entry).test(target));
}

function isRuleExempt(path: string, ruleId: string, allowlist: Allowlist): boolean {
  const target = normalise(path);

  if (ruleId === 'hex-color' && allowlist.tokenFiles.some((file) => normalise(file) === target)) {
    return true;
  }

  return allowlist.exceptions.some(
    (entry) => normalise(entry.path) === target && entry.rules.includes(ruleId),
  );
}

/** Runs every rule over one file's contents. */
export function lintSource(path: string, source: string, allowlist: Allowlist): Violation[] {
  if (isIgnored(path, allowlist)) {
    return [];
  }

  const extension = path.slice(path.lastIndexOf('.'));
  const violations: Violation[] = [];
  const lines = source.split(/\r?\n/);

  for (const rule of DESIGN_RULES) {
    if (rule.extensions && !rule.extensions.includes(extension)) {
      continue;
    }
    if (isRuleExempt(path, rule.id, allowlist)) {
      continue;
    }

    lines.forEach((line, index) => {
      const inlineAllow = INLINE_ALLOW.exec(line);
      if (inlineAllow?.[1] === rule.id) {
        return;
      }

      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(line)) !== null) {
        violations.push({
          path: normalise(path),
          line: index + 1,
          column: match.index + 1,
          ruleId: rule.id,
          message: rule.message,
          excerpt: match[0],
        });

        if (match[0] === '') {
          pattern.lastIndex += 1;
        }
      }
    });
  }

  return violations.sort((a, b) => a.line - b.line || a.column - b.column);
}

/** Formats violations as one `path:line:column  rule  excerpt` line each. */
export function formatViolations(violations: readonly Violation[]): string {
  return violations
    .map(
      (violation) =>
        `${violation.path}:${violation.line}:${violation.column}  ${violation.ruleId}  ` +
        `${JSON.stringify(violation.excerpt)}  ${violation.message}`,
    )
    .join('\n');
}
