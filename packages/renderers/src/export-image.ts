/** A question or option picture for Word and PowerPoint, with the size it was drawn at. */
export interface ExportImage {
  readonly bytes: Uint8Array;
  readonly format: 'png' | 'jpeg';
  /** Natural pixel size; only its shape is used, so a question is never stretched. */
  readonly width: number;
  readonly height: number;
}

/**
 * Scales a picture down to fit a box while keeping its shape. It never scales up past
 * `maxScale` times its natural size, so a small picture is not blown up and blurred.
 */
export function fitInside(
  image: Pick<ExportImage, 'width' | 'height'>,
  maxWidth: number,
  maxHeight: number,
  maxScale = 1,
): { readonly width: number; readonly height: number } {
  if (image.width <= 0 || image.height <= 0) {
    throw new RangeError('An export image needs a positive width and height.');
  }
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, maxScale);
  return { width: image.width * scale, height: image.height * scale };
}

/** Base64 without `Buffer`, so it runs in a browser and in a Web Worker. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}
