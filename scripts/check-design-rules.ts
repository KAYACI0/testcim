/**
 * Design rule gate. Run with `pnpm check:design` from the repository root.
 *
 * Exits with code 1 and lists every violation when a rule from
 * docs/03-tasarim-sistemi.md section 4 is broken.
 */
import { globSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  EMPTY_ALLOWLIST,
  formatViolations,
  lintSource,
  type Allowlist,
  type Violation,
} from './src/design-rules.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

/** Product surfaces only. This script's own source is excluded, since it names the rules. */
const SCAN_PATTERNS = [
  'apps/web/src/**/*.{ts,tsx,css}',
  'apps/web/messages/*.json',
  'packages/*/src/**/*.ts',
];

function loadAllowlist(): Allowlist {
  const path = join(scriptDir, 'design-allowlist.json');
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<Allowlist>;

  return {
    tokenFiles: parsed.tokenFiles ?? EMPTY_ALLOWLIST.tokenFiles,
    ignoredPaths: parsed.ignoredPaths ?? EMPTY_ALLOWLIST.ignoredPaths,
    exceptions: parsed.exceptions ?? EMPTY_ALLOWLIST.exceptions,
  };
}

function collectFiles(): string[] {
  const files = new Set<string>();

  for (const pattern of SCAN_PATTERNS) {
    for (const match of globSync(pattern, { cwd: repoRoot })) {
      files.add(match.replace(/\\/g, '/'));
    }
  }

  return [...files].sort();
}

function main(): void {
  const allowlist = loadAllowlist();
  const files = collectFiles();
  const violations: Violation[] = [];

  for (const file of files) {
    const source = readFileSync(join(repoRoot, file), 'utf8');
    violations.push(...lintSource(file, source, allowlist));
  }

  if (violations.length > 0) {
    console.error(formatViolations(violations));
    console.error(
      `\nTasarim kurali ihlali: ${String(violations.length)} (${String(files.length)} dosya tarandi).`,
    );
    console.error('Kurallar: docs/03-tasarim-sistemi.md bolum 4.');
    process.exit(1);
  }

  console.error(
    `Tasarim kurallari temiz: ${String(files.length)} dosya tarandi, ihlal yok. ` +
      `Kok: ${relative(process.cwd(), repoRoot) || '.'}`,
  );
}

main();
