import JSZip from 'jszip';

import { expect, test } from './support/fixtures';
import { seedEditorTest } from './support/local-supabase';

// Faz 1, madde 4: Word and PowerPoint files are built in the browser from the same
// questions, in the same order, as the PDF. The server only checks the plan.
const QUESTION_COUNT = 6;
const EMU_PER_PX = 9525;
const EMU_PER_INCH = 914400;

test('ücretsiz planda Word ve PowerPoint düğmeleri kilitli', async ({
  admin,
  teacher,
  teacherPage: page,
}) => {
  const { testId } = await seedEditorTest(admin, teacher, 2);
  await page.goto(`/tests/${testId}`);
  await page.getByRole('button', { name: 'Yalnızca zorunlu' }).click();

  await expect(page.locator('[data-paper-screen] img[data-paint-key]')).toHaveCount(2, {
    timeout: 20_000,
  });
  await expect(page.getByRole('button', { name: 'Word indir' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'PowerPoint indir' })).toBeDisabled();
  await expect(
    page.getByText('Word ve PowerPoint çıktısı ücretli planlarda açılır.'),
  ).toBeVisible();
});

test('ücretli planda Word ve PowerPoint dosyaları kâğıttaki sırayla iner', async ({
  admin,
  teacher,
  teacherPage: page,
}, testInfo) => {
  await admin.from('workspaces').update({ plan_id: 'plus' }).eq('id', teacher.workspaceId);

  const { testId } = await seedEditorTest(admin, teacher, QUESTION_COUNT, {
    title: 'Çarpanlara Ayırma Yazılısı',
    settings: { header: { className: '8-A', showAnswerKey: true } },
  });
  await page.goto(`/tests/${testId}`);
  await page.getByRole('button', { name: 'Yalnızca zorunlu' }).click();
  await expect(page.locator('[data-paper-screen] img[data-paint-key]')).toHaveCount(
    QUESTION_COUNT,
    {
      timeout: 20_000,
    },
  );

  // Word
  const wordDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Word indir' }).click();
  const word = await wordDownload;
  expect(word.suggestedFilename()).toBe('Çarpanlara Ayırma Yazılısı.docx');
  const wordPath = testInfo.outputPath('test.docx');
  await word.saveAs(wordPath);

  const docx = await JSZip.loadAsync(
    await import('node:fs').then((fs) => fs.readFileSync(wordPath)),
  );
  const documentXml = await docx.file('word/document.xml')!.async('string');
  expect(documentXml).toContain('Çarpanlara Ayırma Yazılısı');
  expect(documentXml).toContain('8-A');
  for (let n = 1; n <= QUESTION_COUNT; n += 1) {
    expect(documentXml).toContain(`${n}. `);
  }
  // The answer key was on, so each question carries its answer: A, B, C, D, E, A.
  expect([...documentXml.matchAll(/Doğru cevap: ([A-E])/g)].map((match) => match[1])).toEqual([
    'A',
    'B',
    'C',
    'D',
    'E',
    'A',
  ]);
  expect(
    Object.keys(docx.files).filter((name) => /^word\/media\/.+\.png$/.test(name)),
  ).toHaveLength(QUESTION_COUNT);
  // Real pictures at their own shape (900 px wide, heights 260 to 590), never wider than the page text.
  const extents = [...documentXml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)].map((match) => ({
    cx: Number(match[1]),
    cy: Number(match[2]),
  }));
  expect(extents).toHaveLength(QUESTION_COUNT);
  extents.forEach((extent, index) => {
    const height = 260 + (index % 4) * 110;
    expect(extent.cx / extent.cy).toBeCloseTo(900 / height, 1);
    expect(extent.cx / EMU_PER_PX).toBeLessThanOrEqual(600.5);
  });

  // PowerPoint
  const pptxDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PowerPoint indir' }).click();
  const slidesFile = await pptxDownload;
  expect(slidesFile.suggestedFilename()).toBe('Çarpanlara Ayırma Yazılısı.pptx');
  const pptxPath = testInfo.outputPath('test.pptx');
  await slidesFile.saveAs(pptxPath);

  const pptx = await JSZip.loadAsync(
    await import('node:fs').then((fs) => fs.readFileSync(pptxPath)),
  );
  const slideNames = Object.keys(pptx.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  expect(slideNames).toHaveLength(QUESTION_COUNT + 1);

  const slideXml = await Promise.all(slideNames.map((name) => pptx.file(name)!.async('string')));
  expect(slideXml[0]).toContain('Çarpanlara Ayırma Yazılısı');
  slideXml.slice(1).forEach((xml, index) => {
    expect(xml).toContain(`${index + 1}.`);
    const picture =
      /<p:pic>[\s\S]*?<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/.exec(xml);
    expect(picture).not.toBeNull();
    const [x, y, cx, cy] = picture!.slice(1).map(Number) as [number, number, number, number];
    expect(x + cx).toBeLessThanOrEqual(10 * EMU_PER_INCH);
    expect(y + cy).toBeLessThanOrEqual(5.625 * EMU_PER_INCH);
    expect(cx / cy).toBeCloseTo(900 / (260 + (index % 4) * 110), 1);
  });
});
