export { bubbleGrid } from './geometry';
export type { BubbleCell, BubbleGridSpec } from './geometry';

export { buildOmrTemplate, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, BUBBLE_DIAMETER_MM } from './template';
export type {
  BuildOmrTemplateOptions,
  OmrAnswerBubble,
  OmrCornerMark,
  OmrFormTemplate,
  OmrPageTemplate,
  OmrQrSlot,
  OmrTextField,
} from './template';

export { renderOmrFormPdf } from './pdf';
export type { OmrFormPdfMeta } from './pdf';

export { readOmrSheet } from './reader/read';
export type { OmrReadResult } from './reader/read';
export type { OmrGroupResult, OmrMarkFlag } from './reader/score';
export { toGrayscale } from './reader/grayscale';
export type { GrayImage } from './reader/grayscale';
export { solveHomography, applyHomography } from './reader/homography';
export type { Homography, Point } from './reader/homography';
