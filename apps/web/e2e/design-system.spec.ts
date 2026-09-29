import { expect, test } from '@playwright/test';

const WIDTHS = [1440, 1024, 390] as const;

test.describe('design system reference screenshots (docs/03 section 4)', () => {
  for (const width of WIDTHS) {
    test(`renders at ${width}px without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/design-system');
      await expect(page.getByRole('heading', { level: 1, name: 'Tasarım sistemi' })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);

      await expect(page).toHaveScreenshot(`design-system-${width}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
