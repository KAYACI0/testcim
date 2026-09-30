import { sampleMeanIntensity, type GrayImage } from './grayscale';
import { applyHomography, type Homography, type Point } from './homography';

import type { OmrAnswerBubble } from '../template';

/**
 * Grayscale level assumed for a fully inked mark, regardless of ambient lighting.
 * Shadow tolerance instead comes from sampling the background locally (see
 * `sampleBubbleFill`), not from adapting this constant.
 */
const DARK_INK_LEVEL = 60;
/** How far past the bubble's own edge to sample "blank paper", in mm — must land in the
 * corridor between this bubble and its neighbours without touching either. */
const RING_GAP_MM = 0.7;
const SAMPLE_RADIUS_MM = 0.6;

function localPixelScale(h: Homography, center: Point): number {
  const a = applyHomography(h, center);
  const b = applyHomography(h, { x: center.x + 0.1, y: center.y });
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy) / 0.1;
}

export interface BubbleFillSample {
  /** 0 = empty, 1 = fully filled. */
  readonly fillRatio: number;
  readonly localBackground: number;
  readonly measured: number;
}

/**
 * Samples one bubble's fill ratio, calibrated against its own local background rather
 * than a single sheet-wide baseline. That local calibration is what gives shadow
 * tolerance (docs/prompts/10): a bubble under a shadowed part of the page is compared
 * to the paper right next to it, not to the brightness of the whole sheet.
 */
export function sampleBubbleFill(
  gray: GrayImage,
  h: Homography,
  bubble: OmrAnswerBubble,
): BubbleFillSample {
  const centerMm: Point = { x: bubble.x + bubble.diameter / 2, y: bubble.y + bubble.diameter / 2 };
  const scale = localPixelScale(h, centerMm);
  const sampleRadiusPx = Math.max(1, SAMPLE_RADIUS_MM * scale);

  const centerPx = applyHomography(h, centerMm);
  const measured = sampleMeanIntensity(gray, centerPx.x, centerPx.y, sampleRadiusPx);

  const ringRadiusMm = bubble.diameter / 2 + RING_GAP_MM;
  const ringOffsets: readonly Point[] = [
    { x: centerMm.x + ringRadiusMm, y: centerMm.y },
    { x: centerMm.x - ringRadiusMm, y: centerMm.y },
    { x: centerMm.x, y: centerMm.y + ringRadiusMm },
    { x: centerMm.x, y: centerMm.y - ringRadiusMm },
  ];
  const ringSamples = ringOffsets.map((offset) => {
    const px = applyHomography(h, offset);
    return sampleMeanIntensity(gray, px.x, px.y, sampleRadiusPx * 0.6);
  });
  const localBackground =
    ringSamples.reduce((total, value) => total + value, 0) / ringSamples.length;

  const denom = Math.max(1, localBackground - DARK_INK_LEVEL);
  const fillRatio = Math.min(1, Math.max(0, (localBackground - measured) / denom));

  return { fillRatio, localBackground, measured };
}
