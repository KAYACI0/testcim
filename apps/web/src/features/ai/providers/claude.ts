import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { AiOutputValidationError, AiProviderCallError } from '../errors';
import { estimateCostMicro, requireClaudeApiKey } from '../models';

import type { AiGenerateParams, AiGenerateResult, AiImageInput, AiProvider } from '../types';

function buildUserContent(
  prompt: string,
  images: readonly AiImageInput[] | undefined,
): Anthropic.Beta.BetaMessageParam['content'] {
  if (!images || images.length === 0) {
    return prompt;
  }

  return [
    ...images.map((image): Anthropic.Beta.BetaImageBlockParam => ({
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType, data: image.data },
    })),
    { type: 'text', text: prompt },
  ];
}

/**
 * Claude implementation of `AiProvider`. System prompt and user content are
 * always sent as separate blocks — user/pasted content never gets folded
 * into the system prompt, so it can't be read as an instruction (docs/
 * prompts/11-yapay-zeka-paketi.md § Altyapı: "kullanıcı içeriği veri olarak
 * sınırlandırılmış").
 *
 * Uses the beta structured-outputs path (`client.beta.messages.parse` +
 * `betaZodOutputFormat`) — the installed SDK version only exposes JSON
 * output-format parsing under `client.beta`, not the top-level `messages`
 * resource.
 */
export class ClaudeAiProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: requireClaudeApiKey() });
  }

  private callClaude<TOutput>(params: AiGenerateParams<TOutput>) {
    return this.client.beta.messages.parse({
      model: params.model,
      max_tokens: params.maxTokens ?? 8000,
      system: params.system,
      messages: [{ role: 'user', content: buildUserContent(params.prompt, params.images) }],
      output_format: betaZodOutputFormat(params.outputSchema),
    });
  }

  async generate<TOutput>(params: AiGenerateParams<TOutput>): Promise<AiGenerateResult<TOutput>> {
    const response = await this.callClaude(params).catch((error: unknown) => {
      throw new AiProviderCallError(error instanceof Error ? error.message : 'ai_call_failed');
    });

    if (response.stop_reason === 'refusal') {
      throw new AiProviderCallError('ai_refusal');
    }

    if (response.parsed_output === null) {
      throw new AiOutputValidationError();
    }

    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;

    return {
      data: response.parsed_output,
      model: response.model,
      tokensIn,
      tokensOut,
      costMicro: estimateCostMicro(response.model, tokensIn, tokensOut),
    };
  }
}
