import { expect, test } from './support/fixtures';
import { seedQuestions } from './support/local-supabase';

// docs/prompts/08 acceptance: 30 questions in the bank, organise them into a
// folder, tag them, search, then add them to a test. Runs against the local
// Supabase stack through the real login form (see support/fixtures.ts).
const TRIANGLE_COUNT = 6;

test('bankada 30 soru: klasörle, etiketle, ara, teste ekle', async ({
  admin,
  teacher,
  teacherPage: page,
}) => {
  await seedQuestions(admin, teacher, 30, (index) =>
    index < TRIANGLE_COUNT ? `Üçgen sorusu ${index + 1}` : `Dörtgen sorusu ${index + 1}`,
  );
  const { data: test } = await admin
    .from('tests')
    .insert({
      workspace_id: teacher.workspaceId,
      created_by: teacher.userId,
      title: 'Geometri denemesi',
      type: 'exam',
    })
    .select('id')
    .single();

  await page.goto('/bank');
  await expect(page.getByRole('button', { name: 'Yeni klasör' })).toBeVisible();

  // Search narrows the list to the triangle questions.
  await page.getByPlaceholder('Soru metninde ara').first().fill('üçgen');
  await expect(page.getByRole('button', { name: /Üçgen sorusu/ })).toHaveCount(TRIANGLE_COUNT);
  await expect(page.getByRole('button', { name: /Dörtgen sorusu/ })).toHaveCount(0);

  // Select all results and tag them with a new tag.
  await page.getByRole('checkbox', { name: 'Tümünü seç' }).check();
  await expect(page.getByText(`${TRIANGLE_COUNT} soru seçili`)).toBeVisible();
  await page.getByPlaceholder('Yeni etiket adı, Enter ile ekle').fill('deneme-2026');
  await page.getByPlaceholder('Yeni etiket adı, Enter ile ekle').press('Enter');
  await expect
    .poll(async () => {
      const { count } = await admin
        .from('question_tags')
        .select('question_id', { count: 'exact', head: true })
        .eq('workspace_id', teacher.workspaceId);
      return count;
    })
    .toBe(TRIANGLE_COUNT);

  // Add the selection to the existing test.
  await page.getByRole('button', { name: 'Teste ekle' }).click();
  const addDialog = page.getByRole('dialog');
  await addDialog.getByRole('button', { name: 'Teste ekle' }).click();
  await expect(addDialog.getByText(`${TRIANGLE_COUNT} soru eklendi`)).toBeVisible();
  await addDialog.getByRole('button', { name: 'Kapat' }).click();

  // Folder: create it, then move the selection into it.
  await page.getByRole('button', { name: 'Yeni klasör' }).click();
  await page.getByPlaceholder('Klasör adı').fill('Geometri');
  await page.getByPlaceholder('Klasör adı').press('Enter');
  await expect(page.getByRole('button', { name: 'Geometri' })).toBeVisible();

  await page.getByRole('button', { name: 'Klasöre taşı' }).click();
  const moveDialog = page.getByRole('dialog');
  await moveDialog.getByRole('button', { name: 'Gelen kutusu' }).click();
  await page.getByRole('option', { name: 'Geometri' }).click();
  await moveDialog.getByRole('button', { name: 'Klasöre taşı' }).click();

  await expect
    .poll(async () => {
      const { count } = await admin
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', teacher.workspaceId)
        .not('folder_id', 'is', null);
      return count;
    })
    .toBe(TRIANGLE_COUNT);

  const { count: itemCount } = await admin
    .from('test_items')
    .select('id', { count: 'exact', head: true })
    .eq('test_id', test?.id as string);
  expect(itemCount).toBe(TRIANGLE_COUNT);
});
