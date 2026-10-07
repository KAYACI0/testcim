import fontkit from '@pdf-lib/fontkit';

import type { PDFDocument, PDFFont } from 'pdf-lib';

/**
 * The one font family every generated PDF (OMR form, report card, personalised
 * cover, and the layout-engine renderers) embeds: IBM Plex Sans, SIL OFL 1.1,
 * the same family the web app uses (docs/03 typography). pdf-lib's built-in
 * Helvetica is WinAnsi only and cannot encode i-dotless, g-breve or s-cedilla,
 * so Turkish text needs an embedded Unicode font. docs/adr/0011.
 */
export const PDF_FONT_FILES = {
  regular: 'IBMPlexSans-Regular.ttf',
  medium: 'IBMPlexSans-Medium.ttf',
  semibold: 'IBMPlexSans-SemiBold.ttf',
} as const;

export type PdfFontWeight = keyof typeof PDF_FONT_FILES;

/** Raw TTF bytes. The package never does I/O itself; callers load them. */
export type PdfFontBytes = Readonly<Record<PdfFontWeight, Uint8Array>>;

export type PdfFonts = Readonly<Record<PdfFontWeight, PDFFont>>;

/** Where the web app serves the font files from (apps/web/public/fonts). */
export const PDF_FONT_BASE_URL = '/fonts/';

const WEIGHTS = Object.keys(PDF_FONT_FILES) as PdfFontWeight[];

/**
 * Registers fontkit on the document and embeds the three weights, subset to the
 * glyphs actually drawn so a one-page PDF does not carry 600 KB of font.
 */
export async function embedPdfFonts(doc: PDFDocument, bytes: PdfFontBytes): Promise<PdfFonts> {
  doc.registerFontkit(fontkit);

  const embedded = await Promise.all(
    WEIGHTS.map(
      async (weight) => [weight, await doc.embedFont(bytes[weight], { subset: true })] as const,
    ),
  );

  return Object.fromEntries(embedded) as PdfFonts;
}

/** Browser and Web Worker loader: fetches the files the web app serves. */
export async function fetchPdfFontBytes(
  baseUrl: string = PDF_FONT_BASE_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<PdfFontBytes> {
  const loaded = await Promise.all(
    WEIGHTS.map(async (weight) => {
      const response = await fetchImpl(`${baseUrl}${PDF_FONT_FILES[weight]}`);
      if (!response.ok) {
        throw new Error(`pdf_font_load_failed_${weight}_${response.status}`);
      }
      return [weight, new Uint8Array(await response.arrayBuffer())] as const;
    }),
  );

  return Object.fromEntries(loaded) as PdfFontBytes;
}
