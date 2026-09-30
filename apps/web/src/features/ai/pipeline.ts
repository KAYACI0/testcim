import { AiRateLimitedError } from './errors';

/**
 * Everything one `runAiJob` call needs, injected so the orchestration order
 * (docs/prompts/11-yapay-zeka-paketi.md § Altyapı: kimlik → yetki → kredi
 * düşümü → hız sınırı → çağrı → doğrulama → kayıt — identity and the
 * entitlement gate happen before this is called, by the server wiring in
 * run-ai-job.server.ts) is unit-testable without a database or network call.
 */
export interface AiJobPorts<TOutput> {
  readonly createJob: () => Promise<{ readonly id: string }>;
  readonly spendCredits: (jobId: string) => Promise<void>;
  readonly refundCredits: (jobId: string, reason: string) => Promise<void>;
  readonly checkRateLimit: () => Promise<{
    readonly allowed: boolean;
    readonly retryAfterMs?: number;
  }>;
  readonly callProvider: () => Promise<{
    readonly data: TOutput;
    readonly model: string;
    readonly tokensIn: number;
    readonly tokensOut: number;
    readonly costMicro: number;
  }>;
  readonly completeJob: (
    jobId: string,
    result: {
      readonly output: TOutput;
      readonly model: string;
      readonly tokensIn: number;
      readonly tokensOut: number;
      readonly costMicro: number;
      readonly creditsCharged: number;
    },
  ) => Promise<void>;
  readonly failJob: (jobId: string, error: string) => Promise<void>;
}

export interface RunAiJobResult<TOutput> {
  readonly jobId: string;
  readonly data: TOutput;
  readonly model: string;
  readonly creditsCharged: number;
}

/**
 * Runs one AI job end to end: spend credits, check the rate limit, call the
 * provider, record the result. Any failure after credits were spent refunds
 * them before rethrowing, so a workspace never loses credits for a call
 * that didn't produce output.
 */
export async function runAiJob<TOutput>(
  creditsToCharge: number,
  ports: AiJobPorts<TOutput>,
): Promise<RunAiJobResult<TOutput>> {
  const job = await ports.createJob();

  try {
    await ports.spendCredits(job.id);
  } catch (error) {
    await ports.failJob(job.id, 'insufficient_credits');
    throw error;
  }

  try {
    const rateLimit = await ports.checkRateLimit();

    if (!rateLimit.allowed) {
      throw new AiRateLimitedError(rateLimit.retryAfterMs);
    }

    const result = await ports.callProvider();

    await ports.completeJob(job.id, {
      output: result.data,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicro: result.costMicro,
      creditsCharged: creditsToCharge,
    });

    return {
      jobId: job.id,
      data: result.data,
      model: result.model,
      creditsCharged: creditsToCharge,
    };
  } catch (error) {
    await ports.refundCredits(job.id, 'ai_call_failed');
    await ports.failJob(job.id, error instanceof Error ? error.message : 'unknown_error');
    throw error;
  }
}
