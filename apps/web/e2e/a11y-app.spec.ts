import { expectNoSeriousViolations } from './support/a11y';
import { test } from './support/fixtures';

const APP_PATHS = [
  '/home',
  '/bank',
  '/tests',
  '/exams',
  '/classes',
  '/reports',
  '/omr',
  '/billing',
  '/settings',
];

for (const path of APP_PATHS) {
  test(`erişilebilirlik (oturum açık): ${path}`, async ({ teacherPage: page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    await expectNoSeriousViolations(page, path);
  });
}
