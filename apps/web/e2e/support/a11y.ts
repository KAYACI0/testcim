import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Fails on serious and critical WCAG A/AA violations. Minor and moderate findings are
 * reported in the failure text only when a serious one is present, so the gate stays
 * actionable.
 */
export async function expectNoSeriousViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  const summary = serious.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes.length} nodes, e.g. ${violation.nodes[0]?.target.join(' ')}`,
  );

  expect(summary, `${label}: serious accessibility violations`).toEqual([]);
}
