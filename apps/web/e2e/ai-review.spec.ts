import { expect, test } from './support/fixtures';
import { seedEditorTest, seedQuestions } from './support/local-supabase';

// docs/prompts/11 acceptance: generate questions, review them in the tray,
// approve one and add it to a test. An unapproved AI draft must never reach a
// test. The dev server runs with AI_PROVIDER=scripted (playwright.config.ts),
// so no API key or network call is involved.
test('yapay zeka: soru üret, inceleme tepsisinde onayla, teste ekle', async ({
  admin,
  teacher,
  teacherPage: page,
}) => {
  await admin
    .from('credit_ledger')
    .insert({ workspace_id: teacher.workspaceId, delta: 20, reason: 'e2e_grant' });

  const { data: test } = await admin
    .from('tests')
    .insert({
      workspace_id: teacher.workspaceId,
      created_by: teacher.userId,
      title: 'Yapay zeka denemesi',
      type: 'exam',
    })
    .select('id')
    .single();

  await page.goto('/bank');
  await page.getByRole('button', { name: 'Soru üret' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Konu').fill('Birinci dereceden denklemler');
  await dialog.getByLabel('Soru sayısı').fill('2');
  await expect(dialog.getByText('Tahmini maliyet: 2 kredi')).toBeVisible();
  await dialog.getByRole('button', { name: 'Soru üret' }).click();
  await expect(dialog.getByText('2 taslak soru oluşturuldu. Kullanılan kredi: 2.')).toBeVisible();
  await expect(dialog.getByText('Kalan kredi: 18')).toBeVisible();

  const { data: drafts } = await admin
    .from('questions')
    .select('id, ai_generated, ai_review_status, stem_asset_id')
    .eq('workspace_id', teacher.workspaceId);
  expect(drafts).toHaveLength(2);
  expect(drafts?.every((q) => q.ai_generated && q.ai_review_status === 'draft')).toBe(true);
  expect(drafts?.every((q) => q.stem_asset_id === null)).toBe(true);

  await dialog.getByRole('link', { name: 'İnceleme tepsisini aç' }).click();
  await page.waitForURL('**/bank/review');
  await expect(page.getByText('2 taslak', { exact: true })).toBeVisible();
  await expect(page.getByText('Taslak', { exact: true })).toHaveCount(2);

  // Approve the first draft: it is rendered to a PNG in the browser and uploaded to Storage.
  await page.getByRole('button', { name: 'Onayla', exact: true }).first().click();
  await expect(page.getByText('1 soru onaylandı.')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Taslak', { exact: true })).toHaveCount(1);

  const { data: after } = await admin
    .from('questions')
    .select('id, ai_review_status, stem_asset_id')
    .eq('workspace_id', teacher.workspaceId)
    .order('created_at');
  const approved = after?.filter((q) => q.ai_review_status === 'approved') ?? [];
  expect(approved).toHaveLength(1);
  expect(approved[0]?.stem_asset_id).not.toBeNull();

  // The bank holds one approved and one draft question: only the approved one reaches the test.
  await page.goto('/bank');
  await page.getByRole('checkbox', { name: 'Tümünü seç' }).check();
  await page.getByRole('button', { name: 'Teste ekle' }).click();
  const addDialog = page.getByRole('dialog');
  await addDialog.getByRole('button', { name: 'Teste ekle' }).click();
  await expect(addDialog.getByText(/1 soru eklendi/)).toBeVisible();
  await expect(
    addDialog.getByText(/1 soru onaylanmamış taslak olduğu için eklenmedi/),
  ).toBeVisible();

  const { count } = await admin
    .from('test_items')
    .select('id', { count: 'exact', head: true })
    .eq('test_id', test?.id as string);
  expect(count).toBe(1);
});

test('yapay zeka: kredi yetersizse üretim reddedilir ve taslak oluşmaz', async ({
  admin,
  teacher,
  teacherPage: page,
}) => {
  await page.goto('/bank');
  await page.getByRole('button', { name: 'Soru üret' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Konu').fill('Kesirler');
  await dialog.getByRole('button', { name: 'Soru üret' }).click();
  await expect(dialog.getByText('Krediniz yetersiz.')).toBeVisible();

  const { count } = await admin
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', teacher.workspaceId);
  expect(count).toBe(0);
});

test('yapay zeka: denetçi sekmesinden çeldirici ekle ve kalite kontrolü', async ({
  admin,
  teacher,
  teacherPage: page,
}) => {
  await admin
    .from('credit_ledger')
    .insert({ workspace_id: teacher.workspaceId, delta: 10, reason: 'e2e_grant' });
  const [seeded] = await seedQuestions(
    admin,
    teacher,
    1,
    () => 'Bir sayının iki katı 10 ise sayı kaçtır?',
  );

  await page.goto('/bank');
  await page.getByRole('button', { name: /Bir sayının iki katı/ }).click();
  await page.getByRole('tab', { name: 'Yapay zekâ' }).click();

  // The question already has four options, so one distractor fits (five at most).
  await page.getByRole('button', { name: 'Çeldirici ekle' }).last().click();
  await expect(page.getByText('Taslak oluşturuldu. Kullanılan kredi: 1.')).toBeVisible();

  const { data: draft } = await admin
    .from('questions')
    .select('options, ai_review_status, correct, source_meta')
    .eq('workspace_id', teacher.workspaceId)
    .eq('ai_generated', true)
    .single();
  expect(draft?.ai_review_status).toBe('draft');
  expect(draft?.options).toHaveLength(5);
  expect(draft?.correct).toEqual({ question_type: 'mcq', option_id: 'a' });
  expect((draft?.source_meta as { derived_from?: string }).derived_from).toBe(seeded?.id);

  await page.getByRole('button', { name: 'Kalite kontrolü' }).last().click();
  await expect(page.getByText('Son kalite kontrolü')).toBeVisible();
  await expect(page.getByText('Yazım', { exact: true })).toBeVisible();

  const { data: checked } = await admin
    .from('questions')
    .select('source_meta')
    .eq('id', seeded?.id as string)
    .single();
  expect(
    (checked?.source_meta as { ai_quality?: { issues: unknown[] } }).ai_quality?.issues,
  ).toHaveLength(1);
});

test('yapay zeka: görselden metne taslak üretir, görsel soru değişmez', async ({
  admin,
  teacher,
  teacherPage: page,
}) => {
  await admin
    .from('credit_ledger')
    .insert({ workspace_id: teacher.workspaceId, delta: 10, reason: 'e2e_grant' });
  await seedEditorTest(admin, teacher, 1);

  await page.goto('/bank');
  await page.getByRole('button', { name: 'Önizleme yok' }).click();
  await page.getByRole('tab', { name: 'Yapay zekâ' }).click();
  await page.getByRole('button', { name: 'Görselden metne' }).last().click();
  await expect(page.getByText('Taslak oluşturuldu. Kullanılan kredi: 2.')).toBeVisible();

  const { data: rows } = await admin
    .from('questions')
    .select('kind, ai_generated, ai_review_status, stem_text, stem_asset_id')
    .eq('workspace_id', teacher.workspaceId)
    .order('created_at');
  const original = rows?.find((q) => !q.ai_generated);
  const draft = rows?.find((q) => q.ai_generated);
  expect(original?.kind).toBe('image');
  expect(original?.stem_text).toBeNull();
  expect(draft?.kind).toBe('rich');
  expect(draft?.ai_review_status).toBe('draft');
  expect(draft?.stem_text).toContain('Okunan soru');
  expect(draft?.stem_asset_id).toBeNull();

  await page.goto('/bank/review');
  await expect(page.getByText('Görselden metne', { exact: true })).toBeVisible();
  await expect(page.getByText('Okunan soru')).toBeVisible();
});
