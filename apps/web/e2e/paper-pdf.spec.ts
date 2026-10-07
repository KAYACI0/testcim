import { readFileSync } from 'node:fs';

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

import { expect, test } from './support/fixtures';
import { seedEditorTest } from './support/local-supabase';

// Faz 1: the paper the editor shows and the PDF it downloads come from one layout, with
// real images served from Storage (cross-origin from the app, so this also proves the
// image fetch the PDF needs is allowed).
const QUESTION_COUNT = 12;

test('önizleme ve PDF aynı yerleşimden çıkar, gerçek görsellerle', async ({
  admin,
  teacher,
  teacherPage: page,
}, testInfo) => {
  const { testId, itemIds } = await seedEditorTest(admin, teacher, QUESTION_COUNT, {
    title: 'Çarpanlara Ayırma Yazılısı',
    settings: {
      header: {
        schoolName: 'Atatürk Ortaokulu',
        subject: 'Matematik',
        className: '8-A',
        teacherName: 'Şule Işıkçağlar',
        duration: '40',
        showAnswerKey: true,
        showAnswerSheet: true,
      },
    },
  });

  await page.goto(`/tests/${testId}`);
  await page.getByRole('button', { name: 'Yalnızca zorunlu' }).click();

  const screenSheets = page.locator('[data-paper-screen] [data-paper-sheet]');
  await expect(screenSheets.first()).toBeVisible({ timeout: 20_000 });

  // Every question's image is on the paper and has loaded from Storage.
  const images = page.locator('[data-paper-screen] img[data-paint-key]');
  await expect(images).toHaveCount(QUESTION_COUNT);
  await expect
    .poll(() =>
      images.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);

  // The header is drawn with Turkish letters from the paper layer.
  await expect(
    page.locator('[data-paper-screen]').getByText('Atatürk Ortaokulu').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-paper-screen]').getByText('Öğretmen: Şule Işıkçağlar'),
  ).toBeVisible();

  // Selecting a question on the paper marks it with the selection outline.
  await expect(images.first()).toHaveCSS('outline-style', 'none');
  await images.first().click();
  await expect(images.first()).toHaveCSS('outline-style', 'solid');
  await expect(images.nth(1)).toHaveCSS('outline-style', 'none');

  // The same paper is mounted for print.
  await expect(page.locator('#print-root img[data-paint-key]')).toHaveCount(QUESTION_COUNT);

  // Screenshots at the three design breakpoints (docs/03).
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // Download the PDF and read it back.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF indir' }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Çarpanlara Ayırma Yazılısı.pdf');
  const pdfPath = testInfo.outputPath('paper.pdf');
  await download.saveAs(pdfPath);

  const pdf = await getDocument({ data: new Uint8Array(readFileSync(pdfPath)) }).promise;
  const pageCount = await screenSheets.count();
  expect(pdf.numPages).toBe(pageCount);

  let drawnImages = 0;
  const texts: string[] = [];
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const pdfPage = await pdf.getPage(number);
    const content = await pdfPage.getTextContent();
    texts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    const operators = await pdfPage.getOperatorList();
    drawnImages += operators.fnArray.filter((fn) => fn === OPS.paintImageXObject).length;
  }

  // Every question image was embedded, text is vector Turkish, extras are present.
  expect(drawnImages).toBe(QUESTION_COUNT);
  expect(texts[0]).toContain('Atatürk Ortaokulu');
  expect(texts[0]).toContain('Öğretmen: Şule Işıkçağlar');
  expect(texts[0]).toContain('Adı Soyadı:');
  expect(texts.join(' ')).toContain('Cevap Formu');
  expect(texts.join(' ')).toContain('Cevap Anahtarı');
  expect(texts[texts.length - 1]).toContain(`Sayfa ${pdf.numPages} / ${pdf.numPages}`);

  // The PDF holds exactly the questions the editor holds, in the same order.
  expect(itemIds).toHaveLength(QUESTION_COUNT);
  const numbers = texts.flatMap((text) => text.match(/\b\d+\./g) ?? []);
  for (let n = 1; n <= QUESTION_COUNT; n += 1) {
    expect(numbers).toContain(`${n}.`);
  }
});
