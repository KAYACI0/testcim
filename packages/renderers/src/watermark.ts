import { type PDFFont, type PDFPage, degrees, rgb } from 'pdf-lib';

/**
 * Configuration for a tiled text watermark drawn across every page of a PDF.
 * Mirrors `packages/shared`'s `watermarkSchema` but stays free of any Zod/React
 * dependency — this package has neither (CLAUDE.md: `packages/*` has no
 * React/Next dependency).
 */
export interface WatermarkOptions {
  readonly text: string;
  readonly opacity: number;
  readonly angle: number;
  readonly fontSize?: number;
}

/**
 * Tiles `options.text` across the full page in a grid, rotated by
 * `options.angle` degrees. Student-identifying watermark text (e.g. "Ada
 * Lovelace - 101") is interpolated by the caller before this is invoked —
 * this function never reads or stores student data itself.
 */
export function drawTiledWatermark(page: PDFPage, options: WatermarkOptions, font: PDFFont): void {
  const { width, height } = page.getSize();
  const fontSize = options.fontSize ?? 14;
  const textWidth = font.widthOfTextAtSize(options.text, fontSize);
  const stepX = textWidth + 60;
  const stepY = fontSize + 60;

  // Over-tile past the page bounds so the rotated grid still covers every
  // corner; pdf-lib clips anything drawn outside the page automatically.
  const span = Math.max(width, height) * 1.5;
  for (let y = -span; y < height + span; y += stepY) {
    for (let x = -span; x < width + span; x += stepX) {
      page.drawText(options.text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.4, 0.4, 0.4),
        opacity: options.opacity,
        rotate: degrees(options.angle),
      });
    }
  }
}
