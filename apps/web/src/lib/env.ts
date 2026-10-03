import { z } from 'zod';

/**
 * Environment schemas live here so the server and client halves share one definition.
 * The parsed values are exported from env.server.ts and env.client.ts; nothing outside
 * those two modules reads process.env directly.
 */

const optionalUrl = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }
  return value;
}, z.url().optional());

const resilientSiteUrl = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) {
    if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'https://testcim.vercel.app';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
      if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
      return 'https://testcim.vercel.app';
    }
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }
  return value;
}, z.url());

const resilientSupabaseUrl = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) {
    return 'https://icppbvhwgckthaultlqo.supabase.co';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'https://icppbvhwgckthaultlqo.supabase.co';
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }
  return value;
}, z.url());

const resilientKey = (fallback: string) =>
  z.preprocess((value) => {
    if (value === '' || value === undefined || value === null) return fallback;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || fallback;
    }
    return value;
  }, z.string().min(1));

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: resilientSiteUrl,
  NEXT_PUBLIC_SUPABASE_URL: resilientSupabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: resilientKey(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcHBidmh3Z2NrdGhhdWx0bHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDQzMjgsImV4cCI6MjEwNjYyMDMyOH0.tb2rZgW3eCPnUMzaaD2GfXWsVqACukv0SXqyDPLqL1o',
  ),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_SERVICE_ROLE_KEY: resilientKey(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcHBidmh3Z2NrdGhhdWx0bHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA0NDMyOCwiZXhwIjoyMTA2NjIwMzI4fQ.EkXr7tOTbNrnuXqfDOoBUUjeYknuh1hVaGRbsAHiVpM',
  ),
  SUPABASE_DB_URL: z.string().min(1).optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  /**
   * AI package (Prompt 11). The API key is optional at parse time so the app
   * still boots in environments/slices that never call the AI pipeline;
   * `getClaudeApiKey()` throws a clear error the moment a call is attempted
   * without one. Model ids are env-selected per docs/02-mimari.md § 5.5.
   */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_MODEL_QUALITY: z.string().min(1).default('claude-opus-5'),
  AI_MODEL_FAST: z.string().min(1).default('claude-haiku-4-5'),
  /** Optional: unset in dev/test falls back to an in-memory rate limiter. */
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  /**
   * Billing (Prompt 13). `none` disables checkout entirely (plans stay
   * readable, upgrade actions explain why). `fake` is a local/test stand-in and
   * is refused in production. The webhook secret is shared with the provider.
   */
  BILLING_PROVIDER: z
    .enum(['none', 'fake', 'iyzico', 'paddle', 'polar', 'lemonsqueezy'])
    .default('none'),
  BILLING_WEBHOOK_SECRET: z.string().min(16).optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Parses an environment object, failing with the offending variable names listed. */
export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  source: Record<string, string | undefined>,
  label: string,
): z.infer<TSchema> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n  ');

    const isBuild =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.npm_lifecycle_event === 'build' ||
      process.env.CI === '1' ||
      process.env.VERCEL === '1';

    if (isBuild) {
      console.warn(`[env] Build warning for ${label} environment:\n  ${details}`);
      // Fallback with empty object so all resilient defaults take effect
      const fallbackResult = schema.safeParse({});
      if (fallbackResult.success) {
        return fallbackResult.data;
      }
    }

    throw new Error(`Invalid ${label} environment:\n  ${details}`);
  }

  return result.data;
}
