import { expect, test } from '@playwright/test';

test('the home page renders the product name', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Sorunuzu yapıştırın, testiniz hazır olsun',
  );
});

test('the health endpoint reports ok', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok', service: 'testcim-web' });
});

test('security headers are present', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
});
