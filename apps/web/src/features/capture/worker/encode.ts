import { autoTrim, clampDimensions, cropRawImage, pHash, sha256 } from '@testcim/image-tools';
import type { RawImage } from '@testcim/image-tools';

export interface EncodeOptions {
  readonly tolerance?: number;
  readonly padding?: number;
  /** Longest side cap for the stored "original", in px (docs/02 §5.1 input limits). */
  readonly maxSide?: number;
  /** Longest side of the WebP thumbnail (docs/02 §5.1: 480px). */
  readonly thumbnailSide?: number;
}

export interface EncodeResult {
  readonly original: Blob;
  readonly thumbnail: Blob;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly sha256: string;
  readonly phash: string;
}

function bitmapToRawImage(bitmap: ImageBitmap): { raw: RawImage; canvas: OffscreenCanvas } {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable in this Worker.');
  }
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return {
    raw: { width: imageData.width, height: imageData.height, data: imageData.data },
    canvas,
  };
}

function drawScaledCrop(
  bitmap: ImageBitmap,
  box: { x: number; y: number; width: number; height: number },
  target: { width: number; height: number },
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(target.width, target.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable in this Worker.');
  }
  ctx.drawImage(bitmap, box.x, box.y, box.width, box.height, 0, 0, target.width, target.height);
  return canvas;
}

/**
 * Runs inside the capture Worker (docs/02 §5.1, §6): auto-trims whitespace,
 * hashes the trimmed content, and produces the two stored images — a
 * lossless "original" and a small WebP thumbnail. Browser `OffscreenCanvas`
 * WebP export has no true lossless mode (only a lossy `quality`), so the
 * "kayıpsız orijinal" is always PNG here rather than picking PNG-or-WebP by
 * size as docs/02 describes; see docs/backlog.md.
 */
export async function encodeCapturedImage(
  blob: Blob,
  options: EncodeOptions = {},
): Promise<EncodeResult> {
  const bitmap = await createImageBitmap(blob);
  const { raw } = bitmapToRawImage(bitmap);

  const box = autoTrim(raw, {
    ...(options.tolerance !== undefined && { tolerance: options.tolerance }),
    ...(options.padding !== undefined && { padding: options.padding }),
  });
  const target = clampDimensions({ width: box.width, height: box.height }, options.maxSide ?? 2400);

  const originalCanvas = drawScaledCrop(bitmap, box, target);
  const original = await originalCanvas.convertToBlob({ type: 'image/png' });

  const thumbnailSide = options.thumbnailSide ?? 480;
  const thumbnailSize = clampDimensions(target, thumbnailSide);
  const thumbnailCanvas = drawScaledCrop(bitmap, box, thumbnailSize);
  const thumbnail = await thumbnailCanvas.convertToBlob({ type: 'image/webp', quality: 0.82 });

  const trimmed = cropRawImage(raw, box);
  const originalBytes = new Uint8Array(await original.arrayBuffer());

  return {
    original,
    thumbnail,
    width: target.width,
    height: target.height,
    bytes: originalBytes.byteLength,
    sha256: await sha256(originalBytes),
    phash: pHash(trimmed),
  };
}
