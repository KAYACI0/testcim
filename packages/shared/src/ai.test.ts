import { describe, expect, it } from 'vitest';

import { AI_CREDIT_COSTS, AI_JOB_DEFAULT_QUALITY, AI_JOB_KINDS } from './ai';

describe('AI job constants', () => {
  it('has a credit cost and a default quality for every kind', () => {
    for (const kind of AI_JOB_KINDS) {
      expect(AI_CREDIT_COSTS[kind]).toBeGreaterThan(0);
      expect(['fast', 'quality']).toContain(AI_JOB_DEFAULT_QUALITY[kind]);
    }
  });
});
