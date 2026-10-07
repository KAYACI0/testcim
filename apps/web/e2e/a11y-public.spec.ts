import { expect, test } from '@playwright/test';

import { expectNoSeriousViolations } from './support/a11y';

const PUBLIC_PATHS = [
  '/',
  '/features',
  '/pricing',
  '/about',
  '/contact',
  '/help',
  '/changelog',
  '/status',
  '/privacy',
  '/terms',
  '/kvkk',
  '/refund',
  '/copyright',
  '/login',
];

for (const path of PUBLIC_PATHS) {
  test(`erişilebilirlik: ${path}`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expectNoSeriousViolations(page, path);
  });
}
