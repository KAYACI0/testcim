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

export * from './paint-entry';
