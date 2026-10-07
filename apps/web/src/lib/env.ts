import { z } from 'zod';

/**
 * Environment schemas live here so the server and client halves share one definition.
 * The parsed values are exported from env.server.ts and env.client.ts; nothing outside
 * those two modules reads process.env directly.
 */

/** Treats an unset or empty variable alike, so a blank line in .env means "not configured". */
const optionalUrl = z.preprocess((value) => (value === '' ? undefined : value), z.url().optional());

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
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
  /**
   * Polar (docs/adr/0009). Used when BILLING_PROVIDER=polar; BILLING_WEBHOOK_SECRET holds
   * the endpoint's `whsec_...` secret. Polar products have a fixed billing period, so each
   * plan and interval pair maps to its own product id. `sandbox` is the default until the
   * live account is verified.
   */
  POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
  POLAR_SERVER: z.enum(['sandbox', 'production']).default('sandbox'),
  POLAR_PRODUCT_PLUS_MONTH: z.string().min(1).optional(),
  POLAR_PRODUCT_PLUS_YEAR: z.string().min(1).optional(),
  POLAR_PRODUCT_PRO_MONTH: z.string().min(1).optional(),
  POLAR_PRODUCT_PRO_YEAR: z.string().min(1).optional(),
  POLAR_PRODUCT_TEAM_MONTH: z.string().min(1).optional(),
  POLAR_PRODUCT_TEAM_YEAR: z.string().min(1).optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

const BUILD_FALLBACKS: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: 'https://testcim.vercel.app',
  NEXT_PUBLIC_SUPABASE_URL: 'https://icppbvhwgckthaultlqo.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcHBidmh3Z2NrdGhhdWx0bHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDQzMjgsImV4cCI6MjEwNjYyMDMyOH0.tb2rZgW3eCPnUMzaaD2GfXWsVqACukv0SXqyDPLqL1o',
  SUPABASE_SERVICE_ROLE_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcHBidmh3Z2NrdGhhdWx0bHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA0NDMyOCwiZXhwIjoyMTA2NjIwMzI4fQ.EkXr7tOTbNrnuXqfDOoBUUjeYknuh1hVaGRbsAHiVpM',
  BILLING_PROVIDER: 'none',
  AI_MODEL_QUALITY: 'claude-opus-5',
  AI_MODEL_FAST: 'claude-haiku-4-5',
};

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

    if (isBuild && process.env.NODE_ENV !== 'test') {
      // 1. Try merging non-empty sanitized source properties onto BUILD_FALLBACKS
      const sanitizedSource: Record<string, string> = {};
      for (const [k, v] of Object.entries(source)) {
        if (typeof v === 'string' && v.trim()) {
          const trimmed = v.trim();
          sanitizedSource[k] =
            /^https?:\/\//i.test(trimmed) || !trimmed.includes('.')
              ? trimmed
              : `https://${trimmed}`;
        }
      }
      const merged = { ...BUILD_FALLBACKS, ...sanitizedSource };
      const fallbackResult = schema.safeParse(merged);
      if (fallbackResult.success) {
        console.warn(
          `[env] Missing or invalid ${label} environment during build (using build fallbacks):\n  ${details}`,
        );
        return fallbackResult.data;
      }

      // 2. If merged still failed, fall back to pure BUILD_FALLBACKS
      const pureFallbackResult = schema.safeParse(BUILD_FALLBACKS);
      if (pureFallbackResult.success) {
        console.warn(`[env] Using pure build fallbacks for ${label} environment:\n  ${details}`);
        return pureFallbackResult.data;
      }
    }

    throw new Error(`Invalid ${label} environment:\n  ${details}`);
  }

  return result.data;
}
