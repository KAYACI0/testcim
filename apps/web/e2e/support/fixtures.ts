import { test as base, expect, type Page } from '@playwright/test';

import {
  createAdmin,
  createTeacher,
  deleteTeacher,
  type AdminClient,
  type TestTeacher,
} from './local-supabase';

interface Fixtures {
  readonly admin: AdminClient;
  /** A fresh user and workspace, deleted after the test. */
  readonly teacher: TestTeacher;
  /** The same teacher, already signed in through the real login form. */
  readonly teacherPage: Page;
}

export async function signIn(page: Page, teacher: TestTeacher): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(teacher.email);
  await page.locator('input[name="password"]').fill(teacher.password);
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).last().click();
  await page.waitForURL('**/home');
}

export const test = base.extend<Fixtures>({
  // Playwright reads fixture dependencies from the destructured first argument, so the
  // empty pattern is required; `provide` is its `use` callback (renamed: not a React hook).
  // eslint-disable-next-line no-empty-pattern
  admin: async ({}, provide) => {
    await provide(createAdmin());
  },
  teacher: async ({ admin }, provide) => {
    const teacher = await createTeacher(admin);
    await provide(teacher);
    await deleteTeacher(admin, teacher);
  },
  teacherPage: async ({ page, teacher }, provide) => {
    await signIn(page, teacher);
    await provide(page);
  },
});

export { expect };
