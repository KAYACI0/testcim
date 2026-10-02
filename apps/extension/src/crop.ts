export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly dpr?: number;
}

export interface NormalizeInput {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly dpr?: number;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
}

export interface SourceCoordinates {
  readonly sx: number;
  readonly sy: number;
  readonly sWidth: number;
  readonly sHeight: number;
}

export interface CropValidationResult {
  readonly valid: boolean;
  readonly reason?: 'too_small' | 'zero_area' | 'out_of_bounds';
}

/**
 * Normalizes start and end drag points into a valid bounding rectangle.
 * Handles dragging in any direction (up, down, left, right) and clamps to viewport.
 */
export function normalizeCropRect(input: NormalizeInput): CropRect {
  const minX = Math.min(input.startX, input.endX);
  const maxX = Math.max(input.startX, input.endX);
  const minY = Math.min(input.startY, input.endY);
  const maxY = Math.max(input.startY, input.endY);

  const clampedMinX = Math.max(0, minX);
  const clampedMinY = Math.max(0, minY);

  const clampedMaxX =
    typeof input.viewportWidth === 'number' && input.viewportWidth > 0
      ? Math.min(input.viewportWidth, maxX)
      : maxX;

  const clampedMaxY =
    typeof input.viewportHeight === 'number' && input.viewportHeight > 0
      ? Math.min(input.viewportHeight, maxY)
      : maxY;

  const width = Math.max(0, clampedMaxX - clampedMinX);
  const height = Math.max(0, clampedMaxY - clampedMinY);

  return {
    x: Math.round(clampedMinX),
    y: Math.round(clampedMinY),
    width: Math.round(width),
    height: Math.round(height),
    dpr: input.dpr && input.dpr > 0 ? input.dpr : 1,
  };
}

/**
 * Validates whether the crop region is sufficiently large to represent a legible question.
 */
export function validateCropRect(rect: CropRect, minSize: number = 10): CropValidationResult {
  if (rect.width <= 0 || rect.height <= 0) {
    return { valid: false, reason: 'zero_area' };
  }
  if (rect.width < minSize || rect.height < minSize) {
    return { valid: false, reason: 'too_small' };
  }
  if (rect.x < 0 || rect.y < 0) {
    return { valid: false, reason: 'out_of_bounds' };
  }
  return { valid: true };
}

/**
 * Scales viewport crop coordinates to the source screenshot dimensions.
 * Handles display pixel ratios (e.g. Retina / 125% / 150% Windows scaling).
 */
export function calculateSourceCoordinates(
  rect: CropRect,
  screenshotWidth: number,
  screenshotHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): SourceCoordinates {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    const scale = rect.dpr ?? 1;
    return {
      sx: Math.round(rect.x * scale),
      sy: Math.round(rect.y * scale),
      sWidth: Math.round(rect.width * scale),
      sHeight: Math.round(rect.height * scale),
    };
  }

  const scaleX = screenshotWidth / viewportWidth;
  const scaleY = screenshotHeight / viewportHeight;

  const sx = Math.max(0, Math.min(screenshotWidth, Math.round(rect.x * scaleX)));
  const sy = Math.max(0, Math.min(screenshotHeight, Math.round(rect.y * scaleY)));

  const sWidth = Math.max(1, Math.min(screenshotWidth - sx, Math.round(rect.width * scaleX)));
  const sHeight = Math.max(1, Math.min(screenshotHeight - sy, Math.round(rect.height * scaleY)));

  return { sx, sy, sWidth, sHeight };
}
