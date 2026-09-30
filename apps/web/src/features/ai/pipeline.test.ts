import { describe, expect, it, vi } from 'vitest';

import { AiRateLimitedError, InsufficientCreditsError } from './errors';
import { runAiJob, type AiJobPorts } from './pipeline';

function makePorts(
  overrides: Partial<AiJobPorts<{ text: string }>> = {},
): AiJobPorts<{ text: string }> {
  return {
    createJob: vi.fn().mockResolvedValue({ id: 'job-1' }),
    spendCredits: vi.fn().mockResolvedValue(undefined),
    refundCredits: vi.fn().mockResolvedValue(undefined),
    checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    callProvider: vi.fn().mockResolvedValue({
      data: { text: 'ok' },
      model: 'claude-opus-5',
      tokensIn: 10,
      tokensOut: 20,
      costMicro: 123,
    }),
    completeJob: vi.fn().mockResolvedValue(undefined),
    failJob: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('runAiJob', () => {
  it('spends credits, calls the provider, and completes the job on success', async () => {
    const ports = makePorts();

    const result = await runAiJob(1, ports);

    expect(result).toEqual({
      jobId: 'job-1',
      data: { text: 'ok' },
      model: 'claude-opus-5',
      creditsCharged: 1,
    });
    expect(ports.spendCredits).toHaveBeenCalledWith('job-1');
    expect(ports.checkRateLimit).toHaveBeenCalledOnce();
    expect(ports.completeJob).toHaveBeenCalledWith('job-1', {
      output: { text: 'ok' },
      model: 'claude-opus-5',
      tokensIn: 10,
      tokensOut: 20,
      costMicro: 123,
      creditsCharged: 1,
    });
    expect(ports.refundCredits).not.toHaveBeenCalled();
    expect(ports.failJob).not.toHaveBeenCalled();
  });

  it('fails the job and never refunds when the spend itself is rejected', async () => {
    const ports = makePorts({
      spendCredits: vi.fn().mockRejectedValue(new InsufficientCreditsError()),
    });

    await expect(runAiJob(1, ports)).rejects.toBeInstanceOf(InsufficientCreditsError);

    expect(ports.failJob).toHaveBeenCalledWith('job-1', 'insufficient_credits');
    expect(ports.refundCredits).not.toHaveBeenCalled();
    expect(ports.callProvider).not.toHaveBeenCalled();
  });

  it('refunds credits and fails the job when the rate limiter rejects the call', async () => {
    const ports = makePorts({
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: false, retryAfterMs: 5000 }),
    });

    await expect(runAiJob(1, ports)).rejects.toBeInstanceOf(AiRateLimitedError);

    expect(ports.refundCredits).toHaveBeenCalledWith('job-1', 'ai_call_failed');
    expect(ports.failJob).toHaveBeenCalledWith('job-1', 'ai_rate_limited');
    expect(ports.callProvider).not.toHaveBeenCalled();
  });

  it('refunds credits and fails the job when the provider call throws', async () => {
    const ports = makePorts({
      callProvider: vi.fn().mockRejectedValue(new Error('provider_down')),
    });

    await expect(runAiJob(1, ports)).rejects.toThrow('provider_down');

    expect(ports.refundCredits).toHaveBeenCalledWith('job-1', 'ai_call_failed');
    expect(ports.failJob).toHaveBeenCalledWith('job-1', 'provider_down');
    expect(ports.completeJob).not.toHaveBeenCalled();
  });

  it('refunds credits and fails the job when output validation throws', async () => {
    const validationError = new Error('ai_output_validation_failed');
    const ports = makePorts({
      callProvider: vi.fn().mockRejectedValue(validationError),
    });

    await expect(runAiJob(1, ports)).rejects.toThrow('ai_output_validation_failed');

    expect(ports.refundCredits).toHaveBeenCalledWith('job-1', 'ai_call_failed');
    expect(ports.failJob).toHaveBeenCalledWith('job-1', 'ai_output_validation_failed');
  });
});
