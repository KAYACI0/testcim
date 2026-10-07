export { RENDER_TARGETS, isRenderTarget } from './targets';
export type { RenderResult, RenderTarget, Renderer } from './targets';

export { drawTiledWatermark } from './watermark';
export type { WatermarkOptions } from './watermark';

export { renderReportCardPdf } from './pdf-report-card';
export type { ReportCardData, ReportCardOutcomeRow, ReportCardScoreRow } from './pdf-report-card';

export { addPersonalizedCoverPage } from './pdf-personalized-print';
export type { PersonalizedCoverMeta, PersonalizedPrintOptions } from './pdf-personalized-print';

export { renderTestDocx } from './docx-export';
export type { ExportOption, ExportQuestion, ExportTestData } from './docx-export';

export { renderTestPptx } from './pptx-export';
export type { PptxExportData, PptxOption, PptxQuestion } from './pptx-export';

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
  TestPaintContent,
} from './paint-types';
