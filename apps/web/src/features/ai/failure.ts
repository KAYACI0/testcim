import {
  AiOutputValidationError,
  AiProviderCallError,
  AiRateLimitedError,
  InsufficientCreditsError,
} from './errors';

/** Reason codes the UI maps to Turkish messages (`ai.errors.*`). */
export type AiFailureReason =
  | 'insufficient_credits'
  | 'not_entitled'
  | 'not_authorized'
  | 'rate_limited'
  | 'bad_output'
  | 'provider_failed'
  | 'unknown';

/**
 * Maps a pipeline error to a UI reason code. The entitlement and role errors
 * are matched by name because their module is `server-only` and this file
 * must stay importable from unit tests.
 */
export function toAiFailureReason(error: unknown): AiFailureReason {
  if (error instanceof InsufficientCreditsError) return 'insufficient_credits';
  if (error instanceof AiRateLimitedError) return 'rate_limited';
  if (error instanceof AiOutputValidationError) return 'bad_output';
  if (error instanceof AiProviderCallError) return 'provider_failed';
  if (error instanceof Error && error.name === 'EntitlementError') return 'not_entitled';
  if (error instanceof Error && error.name === 'NotAuthorizedError') return 'not_authorized';
  return 'unknown';
}
