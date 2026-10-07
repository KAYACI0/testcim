import { expect, test } from './support/fixtures';
import { seedEditorTest } from './support/local-supabase';

// The rich question panel and the passage panel load on demand (editor-client.tsx), so
// each entry point must still open them: the buttons and the Ctrl+Enter shortcut.
test('editörde soru yaz ve grup ekle panelleri istek üzerine açılır', async ({
  admin,
  teacher,
  teacherPage: page,
}) => {
  const { testId } = await seedEditorTest(admin, teacher, 1);
  await page.goto(`/tests/${testId}`);
  await page.getByRole('button', { name: 'Yalnızca zorunlu' }).click();

  await page.getByRole('button', { name: 'Soru yaz' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Soru yaz' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Soru yaz' })).toBeHidden();

  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('dialog', { name: 'Soru yaz' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Grup ekle' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
