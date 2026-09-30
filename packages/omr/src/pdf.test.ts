import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { renderOmrFormPdf } from './pdf';
import { buildOmrTemplate } from './template';

describe('renderOmrFormPdf', () => {
  it('produces one PDF page per template page, at the template page size', async () => {
    const template = buildOmrTemplate({
      questionCount: 90,
      optionCount: 4,
      studentNumberDigits: 8,
    });
    const bytes = await renderOmrFormPdf(template, {
      testTitle: 'Deneme Sinavi',
      formId: 'FRM-TEST-0001',
      nameLabel: 'Ad Soyad',
      classLabel: 'Sinif',
    });

    const reopened = await PDFDocument.load(bytes);
    expect(reopened.getPageCount()).toBe(template.pages.length);
    expect(template.pages.length).toBeGreaterThan(1);

    const page = reopened.getPage(0);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo((template.pageWidthMm * 72) / 25.4, 1);
    expect(height).toBeCloseTo((template.pageHeightMm * 72) / 25.4, 1);
  });
});
