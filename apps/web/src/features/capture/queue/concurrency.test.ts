import { describe, expect, it } from 'vitest';

import { backoffDelayMs, createConcurrencyLimiter } from './concurrency';

describe('createConcurrencyLimiter', () => {
  it('never runs more than the configured number of tasks at once', async () => {
    const limit = createConcurrencyLimiter(3);
    let active = 0;
    let maxActive = 0;

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        limit(async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;
          return i;
        }),
      ),
    );

    expect(maxActive).toBeLessThanOrEqual(3);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('propagates a rejected task without blocking the others', async () => {
    const limit = createConcurrencyLimiter(2);
    const outcomes = await Promise.allSettled([
      limit(() => Promise.reject(new Error('boom'))),
      limit(() => Promise.resolve('ok')),
    ]);

    expect(outcomes[0]).toMatchObject({ status: 'rejected' });
    expect(outcomes[1]).toMatchObject({ status: 'fulfilled', value: 'ok' });
  });

  it('rejects a non-positive-integer concurrency', () => {
    expect(() => createConcurrencyLimiter(0)).toThrow(RangeError);
  });
});

describe('backoffDelayMs', () => {
  it('doubles with each attempt up to the ceiling', () => {
    expect(backoffDelayMs(0, 1000, 30_000)).toBe(1000);
    expect(backoffDelayMs(1, 1000, 30_000)).toBe(2000);
    expect(backoffDelayMs(2, 1000, 30_000)).toBe(4000);
    expect(backoffDelayMs(10, 1000, 30_000)).toBe(30_000);
  });
});
