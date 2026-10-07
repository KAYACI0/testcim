/**
 * Report card and personalized-print PDF generation on its own: no docx or pptx, so a
 * browser bundle or Worker can import it without pulling in the Node-oriented exporters.
 */
export { renderReportCardPdf } from './pdf-report-card';
export type { ReportCardData, ReportCardOutcomeRow, ReportCardScoreRow } from './pdf-report-card';

export { addPersonalizedCoverPage } from './pdf-personalized-print';
export type { PersonalizedCoverMeta, PersonalizedPrintOptions } from './pdf-personalized-print';

export type { WatermarkOptions } from './watermark';
