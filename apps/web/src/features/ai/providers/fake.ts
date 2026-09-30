import { AiOutputValidationError } from '../errors';

import type { AiGenerateParams, AiGenerateResult, AiProvider } from '../types';

export type FakeAiResponse =
  | {
      readonly kind: 'success';
      readonly output: unknown;
      readonly model?: string;
      readonly tokensIn?: number;
      readonly tokensOut?: number;
      readonly costMicro?: number;
    }
  | { readonly kind: 'error'; readonly error: Error };

/**
 * Scriptable `AiProvider` test double (docs/prompts/11-yapay-zeka-paketi.md
 * § Testler: "sağlayıcıyı taklit eden sahte uygulama"). Queue responses with
 * `enqueueSuccess`/`enqueueError`; each `generate()` call consumes the next
 * one and validates it against the *caller's own* Zod schema, so a bad
 * fixture surfaces as the same `AiOutputValidationError` the real Claude
 * provider would throw — never ship this outside tests.
 */
export class FakeAiProvider implements AiProvider {
  private readonly queue: FakeAiResponse[] = [];
  readonly calls: AiGenerateParams<unknown>[] = [];

  enqueueSuccess(
    output: unknown,
    overrides: Partial<{
      model: string;
      tokensIn: number;
      tokensOut: number;
      costMicro: number;
    }> = {},
  ): this {
    this.queue.push({ kind: 'success', output, ...overrides });
    return this;
  }

  enqueueError(error: Error): this {
    this.queue.push({ kind: 'error', error });
    return this;
  }

  generate<TOutput>(params: AiGenerateParams<TOutput>): Promise<AiGenerateResult<TOutput>> {
    this.calls.push(params);
    const next = this.queue.shift();

    if (!next) {
      return Promise.reject(new Error('FakeAiProvider: no queued response left'));
    }

    if (next.kind === 'error') {
      return Promise.reject(next.error);
    }

    const parsed = params.outputSchema.safeParse(next.output);

    if (!parsed.success) {
      return Promise.reject(new AiOutputValidationError(parsed.error.message));
    }

    return Promise.resolve({
      data: parsed.data,
      model: next.model ?? params.model,
      tokensIn: next.tokensIn ?? 0,
      tokensOut: next.tokensOut ?? 0,
      costMicro: next.costMicro ?? 0,
    });
  }
}
