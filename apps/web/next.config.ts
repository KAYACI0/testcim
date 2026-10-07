import { withSentryConfig } from '@sentry/nextjs/config';
import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

// Content-Security-Policy with cryptographic per-request nonce is injected by src/middleware.ts.
const securityHeaders = [
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
  // Icon and primitive packages export many modules; load only the ones that are imported.
  experimental: { optimizePackageImports: ['@phosphor-icons/react'] },
  poweredByHeader: false,
  // Without this the dev server blocks its own chunks when the page is opened via 127.0.0.1
  // (the E2E base URL), so client components never hydrate.
  allowedDevOrigins: ['127.0.0.1'],
  // Server-side PDF generation reads the font files from disk (lib/pdf-fonts.server.ts), so
  // they must be part of every server trace.
  outputFileTracingIncludes: { '/*': ['./public/fonts/*.ttf'] },
  // Workspace packages ship TypeScript source, so Next compiles them itself.
  transpilePackages: [
    '@testcim/shared',
    '@testcim/layout-engine',
    '@testcim/renderers',
    '@testcim/omr',
    '@testcim/pdf-fonts',
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
