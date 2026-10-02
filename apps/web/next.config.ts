import { withSentryConfig } from '@sentry/nextjs/config';
import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';
/** Analytics origin, allowed in connect-src only when one is configured (loaded after cookie consent). */
const analyticsHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '';

/**
 * Draft Content-Security-Policy. Development needs inline and eval for the Next.js dev
 * overlay and Turbopack HMR. Production is tightened to a nonce in slice 15; see
 * docs/backlog.md.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  [
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
    analyticsHost,
  ]
    .filter(Boolean)
    .join(' '),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages ship TypeScript source, so Next compiles them itself.
  transpilePackages: [
    '@testcim/shared',
    '@testcim/layout-engine',
    '@testcim/renderers',
    '@testcim/omr',
    '@testcim/image-tools',
  ],
  headers: () => Promise.resolve([{ source: '/:path*', headers: securityHeaders }]),
};

const withNextIntl = createNextIntlPlugin();
const configWithIntl = withNextIntl(nextConfig);

// Sentry only wraps the build when a DSN is configured, so a fresh clone builds without it.
function withSentry(config: NextConfig): NextConfig {
  const { SENTRY_ORG: org, SENTRY_PROJECT: project, SENTRY_AUTH_TOKEN: authToken } = process.env;

  return withSentryConfig(config, {
    ...(org ? { org } : {}),
    ...(project ? { project } : {}),
    silent: !process.env.CI,
    // Source map upload stays off until an auth token is provided.
    sourcemaps: { disable: !authToken },
  });
}

export default process.env.NEXT_PUBLIC_SENTRY_DSN ? withSentry(configWithIntl) : configWithIntl;
