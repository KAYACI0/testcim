/** PostHog US cloud, used when a key is configured without an explicit host. */
export const DEFAULT_ANALYTICS_HOST = 'https://us.i.posthog.com';

/** Host the browser sends events to; empty when analytics is not configured. */
export function resolveAnalyticsHost(key: string | undefined, host: string | undefined): string {
  if (!key) {
    return '';
  }

  return host || DEFAULT_ANALYTICS_HOST;
}
