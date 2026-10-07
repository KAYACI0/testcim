import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';

import { readPdfFontBytes } from './node';

import { PDF_FONT_FILES, embedPdfFonts, fetchPdfFontBytes } from './index';

const TURKISH = 'ığşİĞŞçÇöÖüÜâîû';

describe('Turkish PDF text', () => {
  it('is impossible with the built-in Helvetica, which is why this package exists', async () => {
    const doc = await PDFDocument.create();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    expect(() => helvetica.widthOfTextAtSize('ı', 12)).toThrow();
  });

  it('every bundled weight contains all Turkish letters', async () => {
    const bytes = await readPdfFontBytes();
    for (const weight of Object.keys(PDF_FONT_FILES) as (keyof typeof PDF_FONT_FILES)[]) {
      const font = fontkit.create(Buffer.from(bytes[weight]));
      const single = font as unknown as { hasGlyphForCodePoint(codePoint: number): boolean };
      for (const char of TURKISH) {
        expect(single.hasGlyphForCodePoint(char.codePointAt(0)!), `${weight} ${char}`).toBe(true);
      }
    }
  });

  it('embeds and draws Turkish text into a valid PDF', async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedPdfFonts(doc, await readPdfFontBytes());
    const page = doc.addPage([595, 842]);

    page.drawText('İLKÖĞRETİM ığşçöü Şule Işık Çağlayan', {
      x: 40,
      y: 780,
      size: 14,
      font: fonts.regular,
    });
    page.drawText('Öğrenci Karnesi', { x: 40, y: 740, size: 18, font: fonts.semibold });

    expect(fonts.regular.widthOfTextAtSize(TURKISH, 12)).toBeGreaterThan(0);

    const reopened = await PDFDocument.load(await doc.save());
    expect(reopened.getPageCount()).toBe(1);
  });

  it('subsets the fonts so a short page stays small', async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedPdfFonts(doc, await readPdfFontBytes());
    doc.addPage([595, 842]).drawText('Şule', { x: 40, y: 780, size: 14, font: fonts.regular });

    const size = (await doc.save()).byteLength;
    expect(size).toBeLessThan(100_000);
  });
});

describe('fetchPdfFontBytes', () => {
  it('requests each weight from the base URL', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]))));
    const bytes = await fetchPdfFontBytes('/fonts/', fetchMock);

    expect(fetchMock.mock.calls.map((call: unknown[]) => call[0] as string)).toEqual([
      '/fonts/IBMPlexSans-Regular.ttf',
      '/fonts/IBMPlexSans-Medium.ttf',
      '/fonts/IBMPlexSans-SemiBold.ttf',
    ]);
    expect(bytes.regular).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('fails clearly when a file is missing', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('', { status: 404 })));
    await expect(
      fetchPdfFontBytes('/fonts/', fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/pdf_font_load_failed_/);
  });
});
