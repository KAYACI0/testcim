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

    throw new Error(`Invalid ${label} environment:\n  ${details}`);
  }

  return result.data;
}
