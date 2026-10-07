import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDF_FONT_FILES, type PdfFontBytes, type PdfFontWeight } from './index';

/**
 * The font directory inside this repository, for tests and scripts. Computed at
 * call time on purpose: a literal `new URL('...', import.meta.url)` is treated
 * by Turbopack as an asset import and breaks the production build.
 */
export function repoFontDirectory(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'apps',
    'web',
    'public',
    'fonts',
  );
}

/**
 * Node loader for server code and tests. In the web app pass the directory
 * explicitly (`<cwd>/public/fonts`); the default is the repository copy.
 */
export async function readPdfFontBytes(
  directory: string = repoFontDirectory(),
): Promise<PdfFontBytes> {
  const weights = Object.keys(PDF_FONT_FILES) as PdfFontWeight[];

  const loaded = await Promise.all(
    weights.map(async (weight) => {
      const file = await readFile(path.join(directory, PDF_FONT_FILES[weight]));
      return [weight, new Uint8Array(file)] as const;
    }),
  );

  return Object.fromEntries(loaded) as PdfFontBytes;
}
