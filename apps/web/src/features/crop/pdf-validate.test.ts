import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readPdfPageCount } from './pdf-validate';

const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '..',
  'packages',
  'image-tools',
  'fixtures',
);

describe('readPdfPageCount', () => {
  it('reads a single-page fixture without rendering it', async () => {
    const bytes = readFileSync(join(FIXTURES_DIR, 'single-column.pdf'));
    const pageCount = await readPdfPageCount(new Uint8Array(bytes));
    expect(pageCount).toBe(1);
  });

  it('reads the multi-page answer-key fixture', async () => {
    const bytes = readFileSync(join(FIXTURES_DIR, 'answer-key.pdf'));
    const pageCount = await readPdfPageCount(new Uint8Array(bytes));
    expect(pageCount).toBeGreaterThanOrEqual(2);
  });
});
