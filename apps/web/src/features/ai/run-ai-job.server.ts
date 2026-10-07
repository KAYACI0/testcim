import 'server-only';

import {
  AI_CREDIT_COSTS,
  AI_JOB_DEFAULT_QUALITY,
  type AiJobKind,
  type AiModelQuality,
} from '@testcim/shared';
import { limit } from '@testcim/shared';

import { spendAiCredits, refundAiCredits } from './credits';
import { completeAiJob, createAiJob, failAiJob } from './jobs';
import { resolveModel } from './models';
import { runAiJob, type RunAiJobResult } from './pipeline';
import { ClaudeAiProvider } from './providers/claude';
import { ScriptedAiProvider } from './providers/scripted';
import { getAiRateLimiter } from './rate-limit';

import type { AiImageInput, AiProvider } from './types';
import type { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import {
  EntitlementError,
  getEntitlements,
  requireRole,
} from '@/lib/workspace/entitlements.server';

let cachedProvider: AiProvider | undefined;

/** Constructed lazily so a missing ANTHROPIC_API_KEY only breaks an actual AI call, not app boot. */
function getDefaultProvider(): AiProvider {
  if (!cachedProvider) {
    // Offline switch for local dev and E2E; never honored in a production build.
    cachedProvider =
      process.env.AI_PROVIDER === 'scripted' && process.env.NODE_ENV !== 'production'
        ? new ScriptedAiProvider()
        : new ClaudeAiProvider();
  }

  return cachedProvider;
}

/** Only used by tests to swap the singleton provider for a `FakeAiProvider`. */
export function __setDefaultProviderForTests(provider: AiProvider | undefined): void {
  cachedProvider = provider;
}

async function requireAiEnabled(workspaceId: string): Promise<void> {
  const entitlements = await getEntitlements(workspaceId);

  if (limit(entitlements, 'ai_credits_per_month') === 0) {
    throw new EntitlementError('ai_credits_per_month');
  }
}

export interface ExecuteAiJobParams<TOutput> {
  readonly workspaceId: string;
  readonly kind: AiJobKind;
  /** Defaults to the kind's usual tier (`AI_JOB_DEFAULT_QUALITY`). */
  readonly quality?: AiModelQuality;
  /** Defaults to `AI_CREDIT_COSTS[kind]`; pass an explicit amount for kinds billed per generated item. */
  readonly credits?: number;
  readonly system: string;
  readonly prompt: string;
  readonly images?: readonly AiImageInput[];
  readonly outputSchema: z.ZodType<TOutput>;
  readonly maxTokens?: number;
  /** Test-only: inject a `FakeAiProvider` instead of the real Claude provider. */
  readonly provider?: AiProvider;
}

/**
 * The one entry point every AI feature slice (2.1–2.11) calls. Runs the full
 * pipeline from docs/prompts/11-yapay-zeka-paketi.md § Altyapı: identity
 * (`requireRole`) → entitlement gate → credit spend → rate limit → provider
 * call → Zod validation → `ai_jobs` record, refunding credits on any failure
 * after they were spent.
 */
export async function executeAiJob<TOutput>(
  params: ExecuteAiJobParams<TOutput>,
): Promise<RunAiJobResult<TOutput>> {
  await requireRole(params.workspaceId, ['owner', 'admin', 'editor']);
  await requireAiEnabled(params.workspaceId);

  const supabase = await createClient();
  const quality = params.quality ?? AI_JOB_DEFAULT_QUALITY[params.kind];
  const model = resolveModel(quality);
  const credits = params.credits ?? AI_CREDIT_COSTS[params.kind];
  const provider = params.provider ?? getDefaultProvider();
  const rateLimiter = getAiRateLimiter();

  return runAiJob(credits, {
    async createJob() {
      const id = await createAiJob(supabase, params.workspaceId, params.kind, {
        system: params.system,
        prompt: params.prompt,
        hasImages: Boolean(params.images?.length),
      });

      return { id };
    },
    spendCredits: (jobId) => spendAiCredits(supabase, params.workspaceId, credits, jobId),
    refundCredits: (jobId, reason) =>
      refundAiCredits(supabase, params.workspaceId, credits, jobId, reason),
    checkRateLimit: () => rateLimiter.consume(params.workspaceId),
    callProvider: () =>
      provider.generate({
        kind: params.kind,
        model,
        system: params.system,
        prompt: params.prompt,
        outputSchema: params.outputSchema,
        ...(params.images ? { images: params.images } : {}),
        ...(params.maxTokens !== undefined ? { maxTokens: params.maxTokens } : {}),
      }),
    completeJob: (jobId, result) => completeAiJob(supabase, jobId, result),
    failJob: (jobId, error) => failAiJob(supabase, jobId, error),
  });
}
