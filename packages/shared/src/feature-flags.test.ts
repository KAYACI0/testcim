import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { isFeatureEnabled, parseFeatureFlags } from './feature-flags';

describe('parseFeatureFlags', () => {
  it('returns no flags for empty, malformed or invalid input', () => {
    expect(parseFeatureFlags(undefined)).toEqual({});
    expect(parseFeatureFlags('')).toEqual({});
    expect(parseFeatureFlags('{oops')).toEqual({});
    expect(parseFeatureFlags('{"a":{"enabled":"yes"}}')).toEqual({});
    expect(parseFeatureFlags('{"a":{"enabled":true,"percent":150}}')).toEqual({});
  });

  it('parses a valid definition', () => {
    expect(parseFeatureFlags('{"a":{"enabled":true,"percent":10,"workspaces":["w1"]}}')).toEqual({
      a: { enabled: true, percent: 10, workspaces: ['w1'] },
    });
  });
});

describe('isFeatureEnabled', () => {
  it('is off for unknown and disabled flags', () => {
    expect(isFeatureEnabled({}, 'a', 'w1')).toBe(false);
    expect(isFeatureEnabled({ a: { enabled: false } }, 'a', 'w1')).toBe(false);
  });

  it('is on for everyone when enabled without a percentage', () => {
    expect(isFeatureEnabled({ a: { enabled: true } }, 'a', 'w1')).toBe(true);
    expect(isFeatureEnabled({ a: { enabled: true } }, 'a', undefined)).toBe(true);
  });

  it('lets allow-listed workspaces through even when disabled', () => {
    const flags = { a: { enabled: false, workspaces: ['w1'] } };

    expect(isFeatureEnabled(flags, 'a', 'w1')).toBe(true);
    expect(isFeatureEnabled(flags, 'a', 'w2')).toBe(false);
  });

  it('honours the extremes: 0 percent is off, 100 percent is on', () => {
    fc.assert(
      fc.property(fc.uuid(), (workspaceId) => {
        expect(isFeatureEnabled({ a: { enabled: true, percent: 0 } }, 'a', workspaceId)).toBe(
          false,
        );
        expect(isFeatureEnabled({ a: { enabled: true, percent: 100 } }, 'a', workspaceId)).toBe(
          true,
        );
      }),
    );
  });

  it('is monotonic: a workspace enabled at p percent stays enabled at a higher percent', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (workspaceId, a, b) => {
          const low = Math.min(a, b);
          const high = Math.max(a, b);
          const atLow = isFeatureEnabled({ f: { enabled: true, percent: low } }, 'f', workspaceId);
          const atHigh = isFeatureEnabled(
            { f: { enabled: true, percent: high } },
            'f',
            workspaceId,
          );

          expect(!atLow || atHigh).toBe(true);
        },
      ),
    );
  });

  it('enables roughly the requested share of workspaces', () => {
    const flags = { f: { enabled: true, percent: 10 } };
    const total = 5000;
    let enabled = 0;

    for (let index = 0; index < total; index += 1) {
      if (isFeatureEnabled(flags, 'f', `workspace-${index}`)) {
        enabled += 1;
      }
    }

    expect(enabled / total).toBeGreaterThan(0.07);
    expect(enabled / total).toBeLessThan(0.13);
  });

  it('does not enable a percentage flag without a workspace', () => {
    expect(isFeatureEnabled({ a: { enabled: true, percent: 50 } }, 'a', undefined)).toBe(false);
  });
});
