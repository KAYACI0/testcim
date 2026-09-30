import { describe, expect, it } from 'vitest';

import { scoreGroup } from './score';

describe('scoreGroup', () => {
  it('reads a single clearly-filled option as the answer', () => {
    const result = scoreGroup([
      { option: 'A', fillRatio: 0.05 },
      { option: 'B', fillRatio: 0.92 },
      { option: 'C', fillRatio: 0.02 },
      { option: 'D', fillRatio: 0.1 },
    ]);
    expect(result.value).toBe('B');
    expect(result.flag).toBe('ok');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('reads no filled options as a blank, not needing review', () => {
    const result = scoreGroup([
      { option: 'A', fillRatio: 0.02 },
      { option: 'B', fillRatio: 0.05 },
    ]);
    expect(result.value).toBeNull();
    expect(result.flag).toBe('blank');
  });

  it('flags two clearly-filled options as a double mark', () => {
    const result = scoreGroup([
      { option: 'A', fillRatio: 0.9 },
      { option: 'B', fillRatio: 0.85 },
      { option: 'C', fillRatio: 0.02 },
    ]);
    expect(result.value).toBeNull();
    expect(result.flag).toBe('double');
  });

  it('flags a mid-band (erased/partial) fill as ambiguous rather than guessing', () => {
    const result = scoreGroup([
      { option: 'A', fillRatio: 0.45 },
      { option: 'B', fillRatio: 0.05 },
    ]);
    expect(result.value).toBeNull();
    expect(result.flag).toBe('ambiguous');
  });

  it('flags a confident mark alongside an ambiguous one as ambiguous, never silently correct', () => {
    const result = scoreGroup([
      { option: 'A', fillRatio: 0.9 },
      { option: 'B', fillRatio: 0.45 },
    ]);
    expect(result.value).toBeNull();
    expect(result.flag).toBe('ambiguous');
  });
});
