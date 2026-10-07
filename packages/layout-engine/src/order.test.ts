import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { orderBooklet } from './order';
import { mulberry32, shuffled, versionIndex, versionSeed } from './prng';
import { item, scenarioArb } from './test-helpers';

describe('prng', () => {
  it('mulberry32 is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seen: number[] = [];
    for (let i = 0; i < 1000; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      seen.push(value);
    }
    expect(new Set(seen).size).toBeGreaterThan(990);
  });

  it('gives each booklet version its own stream and rejects bad codes', () => {
    const seeds = ['A', 'B', 'C', 'D'].map((code) => versionSeed(7, code));
    expect(new Set(seeds).size).toBe(4);
    expect(versionSeed(7, 'A')).toBe(7);
    expect(versionIndex('d')).toBe(3);
    expect(() => versionIndex('AB')).toThrow(RangeError);
    expect(() => versionIndex('1')).toThrow(RangeError);
  });

  it('shuffled is a permutation and leaves the input alone', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 50 }), fc.integer(), (values, seed) => {
        const copy = [...values];
        const result = shuffled(values, mulberry32(seed));
        expect(values).toEqual(copy);
        expect([...result].sort((x, y) => x - y)).toEqual([...values].sort((x, y) => x - y));
      }),
    );
  });
});

describe('orderBooklet', () => {
  const twenty = Array.from({ length: 20 }, (_, index) => item(`i${index}`));

  it('keeps version A exactly as written, with no option shuffling', () => {
    const result = orderBooklet({ items: twenty, seed: 99, versionCode: 'A' });
    expect(result.orderedItemIds).toEqual(twenty.map((i) => i.id));
    expect(result.optionPermutations).toEqual({});
  });

  it('shuffles the other versions differently from each other', () => {
    const b = orderBooklet({ items: twenty, seed: 99, versionCode: 'B' }).orderedItemIds;
    const c = orderBooklet({ items: twenty, seed: 99, versionCode: 'C' }).orderedItemIds;
    expect(b).not.toEqual(twenty.map((i) => i.id));
    expect(b).not.toEqual(c);
  });

  it('keeps pinned questions in their slot', () => {
    const items = twenty.map((entry, index) =>
      index === 0 || index === 7 || index === 19 ? { ...entry, pinned: true } : entry,
    );
    for (const code of ['B', 'C', 'D']) {
      const { orderedItemIds } = orderBooklet({ items, seed: 5, versionCode: code });
      expect(orderedItemIds[0]).toBe('i0');
      expect(orderedItemIds[7]).toBe('i7');
      expect(orderedItemIds[19]).toBe('i19');
    }
  });

  it('never mixes sections', () => {
    const items = [
      ...Array.from({ length: 6 }, (_, i) => item(`a${i}`, { sectionId: 's0' })),
      ...Array.from({ length: 6 }, (_, i) => item(`b${i}`, { sectionId: 's1' })),
    ];
    const { orderedItemIds } = orderBooklet({ items, seed: 3, versionCode: 'B' });
    expect(orderedItemIds.slice(0, 6).every((id) => id.startsWith('a'))).toBe(true);
    expect(orderedItemIds.slice(6).every((id) => id.startsWith('b'))).toBe(true);
  });

  it('moves a group as one unit and keeps a pinned group in order', () => {
    const items = [
      item('i0'),
      item('g1', { groupId: 'g' }),
      item('g2', { groupId: 'g' }),
      item('g3', { groupId: 'g' }),
      item('i4'),
      item('i5'),
    ];
    for (const code of ['B', 'C', 'D']) {
      const { orderedItemIds } = orderBooklet({ items, seed: 11, versionCode: code });
      const positions = ['g1', 'g2', 'g3']
        .map((id) => orderedItemIds.indexOf(id))
        .sort((a, b) => a - b);
      expect(positions[2]! - positions[0]!).toBe(2);
    }

    const pinned = items.map((entry) => (entry.id === 'g2' ? { ...entry, pinned: true } : entry));
    const { orderedItemIds } = orderBooklet({ items: pinned, seed: 11, versionCode: 'B' });
    const start = orderedItemIds.indexOf('g1');
    expect(orderedItemIds.slice(start, start + 3)).toEqual(['g1', 'g2', 'g3']);
  });

  it('shuffles options of text choice questions only', () => {
    const items = [
      item('text', { kind: 'rich', optionIds: ['a', 'b', 'c', 'd', 'e'] }),
      item('image', { kind: 'image' }),
      item('tf', { questionType: 'tf', optionIds: [] }),
      item('one', { optionIds: ['a'] }),
    ];
    const { optionPermutations } = orderBooklet({ items, seed: 1, versionCode: 'B' });
    expect(Object.keys(optionPermutations)).toEqual(['text']);
    expect([...(optionPermutations.text ?? [])].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('is deterministic and returns a permutation of every item', () => {
    fc.assert(
      fc.property(scenarioArb, fc.constantFrom('A', 'B', 'C', 'D'), (scenario, versionCode) => {
        const args = { items: scenario.items, seed: scenario.seed, versionCode };
        const first = orderBooklet(args);
        expect(orderBooklet(args)).toEqual(first);
        expect([...first.orderedItemIds].sort()).toEqual(scenario.items.map((i) => i.id).sort());

        for (const [id, permutation] of Object.entries(first.optionPermutations)) {
          const source = scenario.items.find((i) => i.id === id);
          expect([...permutation].sort((x, y) => x - y)).toEqual(
            Array.from({ length: source?.optionIds.length ?? 0 }, (_, index) => index),
          );
        }
      }),
    );
  });

  it('keeps sections and groups intact for any scenario', () => {
    fc.assert(
      fc.property(scenarioArb, fc.constantFrom('B', 'C', 'D'), (scenario, versionCode) => {
        const { orderedItemIds } = orderBooklet({
          items: scenario.items,
          seed: scenario.seed,
          versionCode,
        });
        const byId = new Map(scenario.items.map((i) => [i.id, i]));

        const sectionOrder = orderedItemIds.map((id) => byId.get(id)?.sectionId);
        const originalSections = [...new Set(scenario.items.map((i) => i.sectionId))];
        const collapsed = sectionOrder.filter((value, index) => value !== sectionOrder[index - 1]);
        expect(collapsed).toEqual(originalSections);

        const groupIds = [
          ...new Set(scenario.items.flatMap((i) => (i.groupId ? [i.groupId] : []))),
        ];
        for (const groupId of groupIds) {
          const positions = orderedItemIds
            .map((id, index) => (byId.get(id)?.groupId === groupId ? index : -1))
            .filter((index) => index >= 0);
          expect(positions[positions.length - 1]! - positions[0]!).toBe(positions.length - 1);
        }
      }),
    );
  });

  it('rejects an invalid version code even for version A', () => {
    expect(() => orderBooklet({ items: twenty, seed: 1, versionCode: '?' })).toThrow(RangeError);
  });
});
