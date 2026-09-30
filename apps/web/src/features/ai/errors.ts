/** Thrown when `spend_credits` reports the workspace doesn't have enough AI credits. */
export class InsufficientCreditsError extends Error {
  constructor() {
    super('insufficient_credits');
    this.name = 'InsufficientCreditsError';
  }
}

/** Thrown when the AI rate limiter rejects a call. */
export class AiRateLimitedError extends Error {
  constructor(readonly retryAfterMs?: number) {
    super('ai_rate_limited');
    this.name = 'AiRateLimitedError';
  }
}

/** Thrown when the provider's response doesn't validate against the requested Zod schema. */
export class AiOutputValidationError extends Error {
  constructor(message = 'ai_output_validation_failed') {
    super(message);
    this.name = 'AiOutputValidationError';
  }
}

/** Thrown for any other provider failure (network, auth, refusal, ...). */
export class AiProviderCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderCallError';
  }
}
