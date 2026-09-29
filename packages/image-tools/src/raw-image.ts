/**
 * Decoded pixel buffer, RGBA, row-major, matching the layout of DOM
 * `ImageData.data` — but this type itself has no DOM dependency, so the
 * pure algorithms in this package (auto-trim, hashing) can run in Node
 * (tests) as well as a browser Worker. The Worker wrapper that talks to
 * `OffscreenCanvas`/`createImageBitmap` lives in `apps/web`, not here.
 */
export interface RawImage {
  readonly width: number;
  readonly height: number;
  /** Length must be `width * height * 4`. */
  readonly data: Uint8ClampedArray;
}

export interface PixelBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function assertValidImage(image: RawImage): void {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 1 ||
    image.height < 1
  ) {
    throw new RangeError('RawImage width/height must be positive integers.');
  }
  if (image.data.length !== image.width * image.height * 4) {
    throw new RangeError('RawImage data length must equal width * height * 4.');
  }
}

/** Builds a `RawImage` filled with one RGBA color, for tests and defaults. */
export function createSolidImage(
  width: number,
  height: number,
  color: readonly [number, number, number, number] = [255, 255, 255, 255],
): RawImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color[3];
  }
  const image = { width, height, data };
  assertValidImage(image);
  return image;
}

/** Paints a filled rectangle onto a copy of `image`, returning the copy. */
export function paintRect(
  image: RawImage,
  box: PixelBox,
  color: readonly [number, number, number, number],
): RawImage {
  assertValidImage(image);
  const data = new Uint8ClampedArray(image.data);
  const x0 = Math.max(0, box.x);
  const y0 = Math.max(0, box.y);
  const x1 = Math.min(image.width, box.x + box.width);
  const y1 = Math.min(image.height, box.y + box.height);

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * image.width + x) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = color[3];
    }
  }

  return { width: image.width, height: image.height, data };
}

/** Extracts the sub-image described by `box`, clamped to the source bounds. */
export function cropRawImage(image: RawImage, box: PixelBox): RawImage {
  assertValidImage(image);
  const x0 = Math.max(0, Math.min(image.width, Math.round(box.x)));
  const y0 = Math.max(0, Math.min(image.height, Math.round(box.y)));
  const x1 = Math.max(x0, Math.min(image.width, Math.round(box.x + box.width)));
  const y1 = Math.max(y0, Math.min(image.height, Math.round(box.y + box.height)));
  const width = Math.max(1, x1 - x0);
  const height = Math.max(1, y1 - y0);

  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const srcRowStart = ((y0 + y) * image.width + x0) * 4;
    const dstRowStart = y * width * 4;
    data.set(image.data.subarray(srcRowStart, srcRowStart + width * 4), dstRowStart);
  }

  return { width, height, data };
}

export { assertValidImage };
