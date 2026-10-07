import 'server-only';

import path from 'node:path';

import type { PdfFontBytes } from '@testcim/pdf-fonts';
import { readPdfFontBytes } from '@testcim/pdf-fonts/node';

let cached: Promise<PdfFontBytes> | undefined;

/**
 * The PDF font files (docs/adr/0011), read once per server instance from
 * `public/fonts`. next.config.ts adds them to every server trace so they are
 * present in the deployed function, not only in `next dev`.
 */
export function loadPdfFontBytes(): Promise<PdfFontBytes> {
  cached ??= readPdfFontBytes(path.join(process.cwd(), 'public', 'fonts')).catch(
    (error: unknown) => {
      cached = undefined;
      throw error;
    },
  );
  return cached;
}
