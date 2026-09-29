export type ImageSource = 'paste' | 'drop' | 'pdf_crop' | 'mobile' | 'extension' | 'ai' | 'upload';

export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

export interface ImageDescriptor extends PixelSize {
  readonly mime: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly source: ImageSource;
}

/**
 * Scales a pixel size down so neither side exceeds the limit, keeping the aspect ratio.
 * Sizes already within the limit are returned unchanged.
 */
export function clampDimensions(size: PixelSize, maxSide: number): PixelSize {
  if (!Number.isInteger(size.width) || !Number.isInteger(size.height)) {
    throw new RangeError('Pixel dimensions must be integers.');
  }
  if (size.width < 1 || size.height < 1) {
    throw new RangeError('Pixel dimensions must be at least one.');
  }
  if (!Number.isInteger(maxSide) || maxSide < 1) {
    throw new RangeError('The maximum side must be a positive integer.');
  }

  const longestSide = Math.max(size.width, size.height);
  if (longestSide <= maxSide) {
    return size;
  }

  const scale = maxSide / longestSide;

  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}
