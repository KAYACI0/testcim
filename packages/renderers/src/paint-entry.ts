/**
 * The paper drawing layer on its own: no docx or pptx, so a browser bundle or Worker can
 * import it without pulling in the Node-oriented exporters.
 */
export {
  FOOTER_GAP_MM,
  HEADER_BODY_GAP_MM,
  fitLine,
  frameMetrics,
  imageContentWidthMm,
  lineBoxMm,
  paintCompactHeader,
  paintFirstHeader,
  paintFooter,
  paintTest,
  questionImageHeightMm,
  wrapText,
} from './paint';
export type { FrameMetrics } from './paint';
export { PAINT_CSS_VAR, PAINT_RGB } from './paint-colors';
export { renderPaintPdf } from './paint-pdf';
export type { PdfImageInput, RenderPaintPdfOptions } from './paint-pdf';
export { escapeHtml, renderPaintHtml } from './paint-html';
export type { RenderPaintHtmlOptions } from './paint-html';
export type {
  PaintColor,
  PaintCommand,
  PaintDocument,
  PaintExtra,
  PaintPage,
  PaintPageTag,
  TestPaintContent,
} from './paint-types';
