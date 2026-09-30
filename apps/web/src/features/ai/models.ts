import 'server-only';

import type { AiModelQuality } from '@testcim/shared';

import { serverEnv } from '@/lib/env.server';

/** Env-selected model id for a quality tier (docs/02-mimari.md § 5.5). */
export function resolveModel(quality: AiModelQuality): string {
  return quality === 'fast' ? serverEnv.AI_MODEL_FAST : serverEnv.AI_MODEL_QUALITY;
}

/**
 * Throws a clear, actionable error instead of letting the Anthropic SDK fail
 * with a generic "missing API key" message deep in a call stack.
 */
export function requireClaudeApiKey(): string {
  if (!serverEnv.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. The AI package needs it to call the Claude API; see .env.example.',
    );
  }

  return serverEnv.ANTHROPIC_API_KEY;
}

/**
 * Anthropic first-party pricing, USD per million tokens, for the models this
 * app selects via AI_MODEL_QUALITY / AI_MODEL_FAST. Used only to estimate
 * `ai_jobs.cost_micro` for the cost dashboard — not billing-accurate to the
 * cent. An unlisted (e.g. locally overridden) model id falls back to the
 * quality-tier default so cost tracking degrades gracefully instead of
 * throwing.
 */
const PRICING_USD_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export function estimateCostMicro(model: string, tokensIn: number, tokensOut: number): number {
  const pricing =
    PRICING_USD_PER_MILLION_TOKENS[model] ?? PRICING_USD_PER_MILLION_TOKENS['claude-opus-5']!;
  const dollars = (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output;

  return Math.round(dollars * 1_000_000);
}
