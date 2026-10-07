/**
 * Word and PowerPoint export on their own, safe for a browser Worker (no Node APIs), so the
 * file is built where the images already are instead of through a server request body.
 */
export { fitInside, toBase64 } from './export-image';
export type { ExportImage } from './export-image';
export { renderTestDocx } from './docx-export';
export type { ExportOption, ExportQuestion, ExportTestData } from './docx-export';

export { renderTestPptx } from './pptx-export';
export type { PptxExportData, PptxOption, PptxQuestion } from './pptx-export';
