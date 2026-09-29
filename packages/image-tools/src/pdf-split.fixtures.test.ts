import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';

import { parseAnswerKeyTable } from './answer-key-parse';
import { splitTextLayer } from './pdf-split';

import type { PdfTextItem } from './pdf-text';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const manifest = JSON.parse(readFileSync(join(FIXTURES_DIR, 'manifest.json'), 'utf-8')) as Record<
  string,
  {
    expectedNumbersByPage: Record<string, number[]>;
    answerKey?: { number: number; letter: string }[];
  }
>;

/**
 * Loads one fixture PDF through the real `pdfjs-dist` Node build and returns
 * each page's text items already converted to `PdfTextItem` (docs/adr/0003
 * §1 conversion: `yTop = pageHeight - transform[5] - height`) plus page
 * dimensions — this is exactly the shape the browser worker hands to
 * `splitTextLayer` in production, so this test measures the real pipeline,
 * not a mocked one.
 */
async function loadPages(
  fileName: string,
): Promise<{ items: PdfTextItem[]; width: number; height: number }[]> {
  const bytes = readFileSync(join(FIXTURES_DIR, fileName));
  const loadingTask = getDocument({ data: new Uint8Array(bytes) });
  const doc = await loadingTask.promise;
  const pages: { items: PdfTextItem[]; width: number; height: number }[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const { items: rawItems } = await page.getTextContent();

    const items: PdfTextItem[] = rawItems
      .filter((item): item is Extract<(typeof rawItems)[number], { str: string }> => 'str' in item)
      .map((item) => {
        const transform = item.transform as number[];
        return {
          str: item.str,
          x: transform[4]!,
          yTop: viewport.height - transform[5]! - item.height,
          width: item.width,
          height: item.height,
        };
      });

    pages.push({ items, width: viewport.width, height: viewport.height });
    page.cleanup();
  }

  await loadingTask.destroy();
  return pages;
}

describe('splitTextLayer against real pdfjs-dist fixtures', () => {
  it.each(Object.keys(manifest))('%s: suggests the expected question numbers', async (name) => {
    const pages = await loadPages(`${name}.pdf`);
    const expectedByPage = manifest[name]!.expectedNumbersByPage;

    for (const [pageIndexStr, expectedNumbers] of Object.entries(expectedByPage)) {
      const page = pages[Number(pageIndexStr) - 1]!;
      const suggestions = splitTextLayer(page.items, page.width, page.height);
      const foundNumbers = new Set(suggestions.map((s) => s.number));

      for (const expected of expectedNumbers) {
        expect(foundNumbers.has(expected), `expected question ${expected} in ${name}`).toBe(true);
      }
      // No extra, unexpected numbers (a passage line misread as a question, etc.).
      expect(suggestions.map((s) => s.number).sort((a, b) => a - b)).toEqual(
        [...expectedNumbers].sort((a, b) => a - b),
      );
    }
  });

  it('detects at least 90% of questions across all text-layer fixtures (kabul kriteri)', async () => {
    let totalExpected = 0;
    let totalFound = 0;

    for (const [name, { expectedNumbersByPage }] of Object.entries(manifest)) {
      const pages = await loadPages(`${name}.pdf`);
      for (const [pageIndexStr, expectedNumbers] of Object.entries(expectedNumbersByPage)) {
        const page = pages[Number(pageIndexStr) - 1]!;
        const suggestions = splitTextLayer(page.items, page.width, page.height);
        const foundNumbers = new Set(suggestions.map((s) => s.number));

        totalExpected += expectedNumbers.length;
        totalFound += expectedNumbers.filter((n) => foundNumbers.has(n)).length;
      }
    }

    const rate = totalFound / totalExpected;

    console.log(
      `pdf-split detection rate: ${totalFound}/${totalExpected} (${(rate * 100).toFixed(1)}%)`,
    );
    expect(rate).toBeGreaterThanOrEqual(0.9);
  });

  it('parses the answer key from the fixture with a real answer table', async () => {
    const pages = await loadPages('answer-key.pdf');
    const answerPage = pages[1]!;

    const entries = parseAnswerKeyTable(answerPage.items);

    expect(entries).toEqual(manifest['answer-key']!.answerKey);
  });
});
