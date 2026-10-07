import { describe, expect, it } from 'vitest';

import { DEFAULT_ANALYTICS_HOST, resolveAnalyticsHost } from './analytics-host';

describe('resolveAnalyticsHost', () => {
  it('is empty without a key so the CSP stays closed', () => {
    expect(resolveAnalyticsHost(undefined, 'https://eu.i.posthog.com')).toBe('');
  });

  it('uses the configured host', () => {
    expect(resolveAnalyticsHost('phc_x', 'https://eu.i.posthog.com')).toBe(
      'https://eu.i.posthog.com',
    );
  });

  it('falls back to the default host when only the key is set', () => {
    expect(resolveAnalyticsHost('phc_x', undefined)).toBe(DEFAULT_ANALYTICS_HOST);
    expect(resolveAnalyticsHost('phc_x', '')).toBe(DEFAULT_ANALYTICS_HOST);
  });
});
