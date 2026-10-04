import { clientEnvSchema, parseEnv, type ClientEnv } from './env';

function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/**
 * Public environment. Each variable is spelled out literally so Next.js can inline it
 * into the client bundle; a dynamic process.env lookup would be undefined in the browser.
 */
export const clientEnv: ClientEnv = parseEnv(
  clientEnvSchema,
  {
    NEXT_PUBLIC_SITE_URL:
      normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://testcim.vercel.app'),
    NEXT_PUBLIC_SUPABASE_URL: normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined,
    NEXT_PUBLIC_SENTRY_DSN: normalizeUrl(process.env.NEXT_PUBLIC_SENTRY_DSN),
  },
  'client',
);
