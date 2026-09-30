import type { z } from 'zod';

/** A base64-encoded image attached to a generation call (vision input). */
export interface AiImageInput {
  readonly mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  readonly data: string;
}

export interface AiGenerateParams<TOutput> {
  readonly model: string;
  /** System prompt: fixed instructions, never user content (injection boundary). */
  readonly system: string;
  /** User content: may embed pasted/user-supplied text, always marked as data in the prompt template. */
  readonly prompt: string;
  readonly images?: readonly AiImageInput[];
  readonly outputSchema: z.ZodType<TOutput>;
  readonly maxTokens?: number;
}

export interface AiGenerateResult<TOutput> {
  readonly data: TOutput;
  readonly model: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  /** Estimated cost in millionths of a US dollar (matches `ai_jobs.cost_micro`). */
  readonly costMicro: number;
}

/**
 * Provider abstraction (docs/prompts/11-yapay-zeka-paketi.md § Altyapı). The
 * Claude implementation lives in `providers/claude.ts`; `providers/fake.ts`
 * is a scriptable test double, never used outside tests.
 */
export interface AiProvider {
  generate<TOutput>(params: AiGenerateParams<TOutput>): Promise<AiGenerateResult<TOutput>>;
}
