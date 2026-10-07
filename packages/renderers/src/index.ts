export { RENDER_TARGETS, isRenderTarget } from './targets';
export type { RenderResult, RenderTarget, Renderer } from './targets';

export { drawTiledWatermark } from './watermark';
export type { WatermarkOptions } from './watermark';

export { renderReportCardPdf } from './pdf-report-card';
export type { ReportCardData, ReportCardOutcomeRow, ReportCardScoreRow } from './pdf-report-card';

export { addPersonalizedCoverPage } from './pdf-personalized-print';
export type { PersonalizedCoverMeta, PersonalizedPrintOptions } from './pdf-personalized-print';

export * from './export-entry';
export * from './paint-entry';
