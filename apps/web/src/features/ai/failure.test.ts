import { describe, expect, it } from 'vitest';

import {
  AiOutputValidationError,
  AiProviderCallError,
  AiRateLimitedError,
  InsufficientCreditsError,
} from './errors';
import { toAiFailureReason } from './failure';

describe('toAiFailureReason', () => {
  it('maps pipeline errors to reason codes', () => {
    expect(toAiFailureReason(new InsufficientCreditsError())).toBe('insufficient_credits');
    expect(toAiFailureReason(new AiRateLimitedError(1000))).toBe('rate_limited');
    expect(toAiFailureReason(new AiOutputValidationError())).toBe('bad_output');
    expect(toAiFailureReason(new AiProviderCallError('x'))).toBe('provider_failed');
  });

  it('recognizes entitlement and role errors by name', () => {
    const entitlement = new Error('entitlement_denied:ai_credits_per_month');
    entitlement.name = 'EntitlementError';
    const role = new Error('not_authorized');
    role.name = 'NotAuthorizedError';
    expect(toAiFailureReason(entitlement)).toBe('not_entitled');
    expect(toAiFailureReason(role)).toBe('not_authorized');
  });

  it('falls back to unknown for anything else', () => {
    expect(toAiFailureReason(new Error('boom'))).toBe('unknown');
    expect(toAiFailureReason('string')).toBe('unknown');
  });
});
