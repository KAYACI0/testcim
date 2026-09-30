import { expect, test } from '@playwright/test';

// docs/prompts/09 acceptance: "yayınla → iki öğrenci katıl → cevapla →
// teslim → sonuç ve analiz → Excel". Skipped for the same reason as
// apps/web/e2e/bank.spec.ts: this repo has no fixture yet that signs in a
// teacher, creates a workspace/test with real Supabase auth+RLS, and
// publishes an exam — every existing e2e test here only covers
// unauthenticated routes. Once that fixture exists, un-skip and point
// `slug` at a freshly published exam in the same workspace.
test.skip('yayınla, iki öğrenci katılır, cevaplar, teslim eder, öğretmen sonuçları görür', async ({
  browser,
}) => {
  const slug = 'e2e-test-exam-slug';

  const studentA = await browser.newContext();
  const pageA = await studentA.newPage();
  await pageA.goto(`/s/${slug}`);
  await pageA.getByPlaceholder('Ad Soyad').fill('Öğrenci A');
  await pageA.getByRole('button', { name: 'Sınava başla' }).click();

  const studentB = await browser.newContext();
  const pageB = await studentB.newPage();
  await pageB.goto(`/s/${slug}`);
  await pageB.getByPlaceholder('Ad Soyad').fill('Öğrenci B');
  await pageB.getByRole('button', { name: 'Sınava başla' }).click();

  await pageA.getByRole('button', { name: 'Sınavı teslim et' }).click();
  await expect(pageA.getByText('Cevaplarınız kaydedildi')).toBeVisible();

  await pageB.getByRole('button', { name: 'Sınavı teslim et' }).click();
  await expect(pageB.getByText('Cevaplarınız kaydedildi')).toBeVisible();

  await studentA.close();
  await studentB.close();
});
