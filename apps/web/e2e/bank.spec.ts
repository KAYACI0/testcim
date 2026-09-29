import { expect, test } from '@playwright/test';

// docs/prompts/08 acceptance: "30 soru bankaya düşür → klasörle → etiketle →
// ara → bankadan yeni teste ekle". Skipped: like every other authenticated
// flow in this repo (Prompts 04/06/07 have the same gap — see
// docs/backlog.md), there is no CI/local fixture yet that signs in a test
// user and seeds a workspace with real Supabase auth+RLS in place; the
// smoke tests in this directory only cover unauthenticated routes. Once
// that fixture exists (e.g. a `test.beforeAll` that creates a user +
// workspace via the service role and reuses `storageState`), un-skip this
// and point `testId` at a freshly created test in the same workspace.
test.skip('30 soru bankaya düşür, klasörle, etiketle, ara, teste ekle', async ({ page }) => {
  await page.goto('/bank');

  // Bankaya düşürme: bu senaryoda 30 soru zengin editörle önceden
  // oluşturulmuş olmalı (rich-editor "Bankaya kaydet" gerektirmeden testin
  // Gelen kutusu'na düşer — Prompt 04/07 akışı).
  await expect(page.getByRole('button', { name: 'Yeni klasör' })).toBeVisible();

  // Klasörle.
  await page.getByRole('button', { name: 'Yeni klasör' }).click();
  await page.getByPlaceholder('Klasör adı').fill('Geometri');
  await page.getByPlaceholder('Klasör adı').press('Enter');
  await expect(page.getByRole('button', { name: 'Geometri' })).toBeVisible();

  // Etiketle (toplu seçim + yeni etiket).
  await page.getByRole('checkbox', { name: 'Soruyu seç' }).first().check();
  await page.getByPlaceholder('Yeni etiket adı, Enter ile ekle').fill('deneme-2026');
  await page.getByPlaceholder('Yeni etiket adı, Enter ile ekle').press('Enter');

  // Ara.
  await page.getByPlaceholder('Soru metninde ara').fill('üçgen');
  await expect(page.getByText('üçgen', { exact: false }).first()).toBeVisible();

  // Bankadan yeni teste ekle.
  await page.getByRole('checkbox', { name: 'Soruyu seç' }).first().check();
  await page.getByRole('button', { name: 'Teste ekle' }).click();
});
