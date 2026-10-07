import { expect, test } from './support/fixtures';
import { seedOpenExam, seedQuestions } from './support/local-supabase';

import type { Browser } from '@playwright/test';

// docs/prompts/09 acceptance: a published exam, two students join in separate
// browsers, answer, submit, and the teacher sees both in the results. Students
// are anonymous and never sign in; the teacher uses the real login form.
const QUESTION_COUNT = 3;

async function takeExam(
  browser: Browser,
  baseURL: string,
  slug: string,
  name: string,
  answerAll: boolean,
) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto(`/s/${slug}`);
  // The consent banner is fixed to the bottom and would cover the submit button.
  await page.getByRole('button', { name: 'Yalnızca zorunlu' }).click();
  await page.getByPlaceholder('Ad Soyad').fill(name);
  await page.getByRole('button', { name: 'Sınava başla' }).click();

  const submit = page.getByRole('button', { name: 'Sınavı teslim et' });
  await expect(submit).toBeVisible();

  if (answerAll) {
    const correctChoices = page.getByRole('radio', { name: 'Birinci seçenek' });
    await expect(correctChoices).toHaveCount(QUESTION_COUNT);
    for (let index = 0; index < QUESTION_COUNT; index += 1) {
      await correctChoices.nth(index).click();
    }
  }

  await submit.click();
  await expect(page.getByText('Cevaplarınız kaydedildi')).toBeVisible();
  return { context, page };
}

test('yayınla, iki öğrenci katılır, cevaplar, teslim eder, öğretmen sonuçları görür', async ({
  browser,
  baseURL,
  admin,
  teacher,
  teacherPage,
}) => {
  const questions = await seedQuestions(
    admin,
    teacher,
    QUESTION_COUNT,
    (index) => `Sınav sorusu ${index + 1}`,
  );
  const exam = await seedOpenExam(admin, teacher, questions);

  const first = await takeExam(browser, baseURL as string, exam.slug, 'Öğrenci A', true);
  await expect(
    first.page.getByText(`Puanınız: ${QUESTION_COUNT} / ${QUESTION_COUNT}`),
  ).toBeVisible();

  const second = await takeExam(browser, baseURL as string, exam.slug, 'Öğrenci B', false);
  await expect(second.page.getByText(`Puanınız: 0 / ${QUESTION_COUNT}`)).toBeVisible();

  await first.context.close();
  await second.context.close();

  await teacherPage.goto(`/exams/${exam.examId}`);
  await expect(teacherPage.getByRole('heading', { name: 'Sınav sonuçları' })).toBeVisible();
  await expect(teacherPage.getByText('Öğrenci A')).toBeVisible();
  await expect(teacherPage.getByText('Öğrenci B')).toBeVisible();
  await expect(teacherPage.getByText('Teslim edildi')).toHaveCount(2);
  await expect(teacherPage.getByText('2 katılımcı')).toBeVisible();
});
