// Manual navigation timing against a production server (not part of the test suite):
//   PERF_BASE_URL=http://127.0.0.1:3300 pnpm exec tsx e2e/support/perf-nav.ts
// Needs the local Supabase stack and a `next start` build made with the local keys.
import { chromium } from '@playwright/test';

import { createAdmin, createTeacher, deleteTeacher } from './local-supabase';

const base = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3300';
const ROUTES: readonly { href: string }[] = [
  { href: '/tests' },
  { href: '/bank' },
  { href: '/classes' },
  { href: '/exams' },
  { href: '/reports' },
  { href: '/omr' },
  { href: '/settings/profile' },
];

async function main() {
  const admin = createAdmin();
  const teacher = await createTeacher(admin);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${base}/login`);
    await page.locator('input[name="email"]').fill(teacher.email);
    await page.locator('input[name="password"]').fill(teacher.password);
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).last().click();
    await page.waitForURL('**/home');
    await page.waitForLoadState('networkidle');

    const rows: string[] = [];
    for (let round = 0; round < 2; round += 1) {
      for (const route of ROUTES) {
        const link = page.locator(`nav a[href="${route.href}"]`).first();
        // Let hover/viewport prefetch happen, as a real user pointing at the link would.
        await link.hover();
        await page.waitForTimeout(400);
        const previousHeading =
          (await page
            .locator('h1')
            .first()
            .textContent()
            .catch(() => '')) ?? '';
        const started = Date.now();
        await link.click();
        await page.waitForURL(`**${route.href}`);
        const urlMs = Date.now() - started;
        await page
          .waitForFunction(
            (previous) => {
              const h1 = document.querySelector('h1')?.textContent ?? '';
              return h1.length > 0 && h1 !== previous;
            },
            previousHeading,
            { timeout: 8000 },
          )
          .catch(() => {
            console.warn(`no new h1 on ${route.href} (previous: ${previousHeading})`);
          });
        const contentMs = Date.now() - started;
        await page.waitForLoadState('networkidle');
        if (round === 1)
          rows.push(`${route.href.padEnd(20)} url ${urlMs} ms   content ${contentMs} ms`);
      }
    }
    console.warn(rows.join('\n'));

    const ttfb: string[] = [];
    for (const route of ROUTES) {
      const t0 = Date.now();
      const response = await page.goto(`${base}${route.href}`, { waitUntil: 'commit' });
      ttfb.push(`${route.href.padEnd(20)} TTFB ${Date.now() - t0} ms (${response?.status()})`);
      await page.waitForLoadState('networkidle');
    }
    console.warn('\nFull loads\n' + ttfb.join('\n'));
  } finally {
    await browser.close();
    await deleteTeacher(admin, teacher);
  }
}

void main();
