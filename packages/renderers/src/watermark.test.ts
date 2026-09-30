import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { drawTiledWatermark } from './watermark';

describe('drawTiledWatermark', () => {
  it('draws without throwing for a range of angles and opacities', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);

    for (const angle of [-90, -30, 0, 30, 90]) {
      expect(() =>
        drawTiledWatermark(page, { text: 'Ada Lovelace - 101', opacity: 0.08, angle }, font),
      ).not.toThrow();
    }
  });

  it('keeps the resulting PDF loadable', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);
    drawTiledWatermark(page, { text: 'TASLAK', opacity: 0.1, angle: -30 }, font);

    const bytes = await doc.save();
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
