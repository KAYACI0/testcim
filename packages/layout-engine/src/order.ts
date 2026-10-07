import { mulberry32, shuffled, versionSeed } from './prng';

import type { BookletOrdering, LayoutItemInput } from './types';

interface Unit {
  readonly itemIds: string[];
  /** A unit with a pinned item (or any item, for a single-question unit) keeps its slot. */
  readonly pinned: boolean;
  readonly isGroup: boolean;
}

/** Splits one section's items into shuffle units: a group is one unit, a loose item is its own. */
function buildUnits(items: readonly LayoutItemInput[]): Unit[] {
  const units: { itemIds: string[]; pinned: boolean; isGroup: boolean }[] = [];
  const unitByGroup = new Map<string, (typeof units)[number]>();

  for (const item of items) {
    if (item.groupId) {
      const existing = unitByGroup.get(item.groupId);
      if (existing) {
        existing.itemIds.push(item.id);
        existing.pinned ||= item.pinned;
        continue;
      }
      const unit = { itemIds: [item.id], pinned: item.pinned, isGroup: true };
      unitByGroup.set(item.groupId, unit);
      units.push(unit);
    } else {
      units.push({ itemIds: [item.id], pinned: item.pinned, isGroup: false });
    }
  }

  return units;
}

/**
 * Orders one booklet version. Version 'A' is the test as written. Every other
 * version is a constrained shuffle from a seed derived from `(seed, versionCode)`:
 * sections never mix, pinned questions keep their slot, a group moves as one unit and
 * its members may reorder among themselves (unless the group is pinned).
 *
 * Choice options are shuffled only for text questions; an image question's options are
 * part of the picture, so only its place in the booklet changes.
 */
export function orderBooklet(input: {
  readonly items: readonly LayoutItemInput[];
  readonly seed: number;
  readonly versionCode: string;
}): BookletOrdering {
  const { items, seed, versionCode } = input;

  // Validates the code too, so a bad version fails for 'A' as well.
  const streamSeed = versionSeed(seed, versionCode);

  if (versionCode.toUpperCase() === 'A') {
    return { orderedItemIds: items.map((item) => item.id), optionPermutations: {} };
  }

  const random = mulberry32(streamSeed);

  const sections = new Map<string, LayoutItemInput[]>();
  for (const item of items) {
    const key = item.sectionId ?? '';
    const bucket = sections.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      sections.set(key, [item]);
    }
  }

  const orderedItemIds: string[] = [];

  for (const sectionItems of sections.values()) {
    const units = buildUnits(sectionItems);

    const freeSlots: number[] = [];
    units.forEach((unit, index) => {
      if (!unit.pinned) freeSlots.push(index);
    });

    const movable = shuffled(
      freeSlots.map((index) => units[index] as Unit),
      random,
    );
    const placed = [...units];
    freeSlots.forEach((slot, i) => {
      placed[slot] = movable[i] as Unit;
    });

    for (const unit of placed) {
      const ids = unit.isGroup && !unit.pinned ? shuffled(unit.itemIds, random) : unit.itemIds;
      orderedItemIds.push(...ids);
    }
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const optionPermutations: Record<string, readonly number[]> = {};

  for (const id of orderedItemIds) {
    const item = byId.get(id);
    if (item && item.kind === 'rich' && item.questionType === 'mcq' && item.optionIds.length >= 2) {
      optionPermutations[id] = shuffled(
        Array.from({ length: item.optionIds.length }, (_, index) => index),
        random,
      );
    }
  }

  return { orderedItemIds, optionPermutations };
}
