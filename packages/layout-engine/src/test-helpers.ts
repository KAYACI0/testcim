import fc from 'fast-check';

import type {
  LayoutInput,
  LayoutItemInput,
  LayoutMode,
  LayoutSectionInput,
  LayoutSettingsInput,
} from './types';

export const baseSettings: LayoutSettingsInput = {
  pageSize: 'A4',
  orientation: 'portrait',
  columns: 2,
  marginsMm: { top: 12, bottom: 12, left: 12, right: 12 },
  columnGapMm: 8,
  questionGapMm: 4,
  headerHeightMm: 40,
  continuationHeaderHeightMm: 12,
  footerHeightMm: 8,
  mode: 'strict',
  fitPagesScaleMin: 0.85,
  columnBalance: false,
  lookahead: 3,
};

export interface Fixture {
  readonly input: LayoutInput;
  readonly heights: ReadonlyMap<string, number>;
}

export function item(id: string, overrides: Partial<LayoutItemInput> = {}): LayoutItemInput {
  return {
    id,
    questionId: `q-${id}`,
    sectionId: null,
    groupId: null,
    pinned: false,
    kind: 'rich',
    questionType: 'mcq',
    optionIds: ['a', 'b', 'c', 'd'],
    correct: { question_type: 'mcq', option_id: 'a' },
    ...overrides,
  };
}

/** Heights keyed by item id, and by `passage:<groupId>` for group passages. */
export function inputOf(options: {
  readonly items: readonly LayoutItemInput[];
  readonly heights: ReadonlyMap<string, number>;
  readonly settings?: Partial<LayoutSettingsInput>;
  readonly sections?: readonly LayoutSectionInput[];
  readonly versionCode?: string;
  readonly seed?: number;
}): LayoutInput {
  const groupIds = [...new Set(options.items.flatMap((i) => (i.groupId ? [i.groupId] : [])))];
  return {
    items: options.items,
    groups: groupIds.map((id) => ({ id })),
    sections: options.sections ?? [],
    settings: { ...baseSettings, ...options.settings },
    seed: options.seed ?? 12345,
    versionCode: options.versionCode ?? 'A',
    measure: {
      item: (id) => options.heights.get(id) ?? 30,
      passage: (id) => options.heights.get(`passage:${id}`) ?? 20,
    },
  };
}

const modeArb: fc.Arbitrary<LayoutMode> = fc.constantFrom('strict', 'flexible');

export interface Scenario {
  readonly items: readonly LayoutItemInput[];
  readonly heights: ReadonlyMap<string, number>;
  readonly sections: readonly LayoutSectionInput[];
  readonly settings: Partial<LayoutSettingsInput>;
  readonly seed: number;
}

/**
 * Random but structurally valid tests: sections in order, groups contiguous inside a
 * section, a few pinned questions, heights from tiny to taller than a column.
 */
export const scenarioArb: fc.Arbitrary<Scenario> = fc
  .record({
    sectionCount: fc.integer({ min: 1, max: 3 }),
    plan: fc.array(
      fc.record({
        section: fc.nat({ max: 2 }),
        groupSize: fc.constantFrom(0, 0, 0, 2, 3),
        height: fc.integer({ min: 5, max: 140 }),
        pinned: fc.boolean(),
      }),
      { maxLength: 40 },
    ),
    columns: fc.constantFrom<1 | 2 | 3>(1, 2, 3),
    gap: fc.integer({ min: 3, max: 10 }),
    mode: modeArb,
    balance: fc.boolean(),
    startsNewPage: fc.boolean(),
    seed: fc.integer({ min: 0, max: 2 ** 31 }),
  })
  .map(({ sectionCount, plan, columns, gap, mode, balance, startsNewPage, seed }) => {
    const items: LayoutItemInput[] = [];
    const heights = new Map<string, number>();
    const sections: LayoutSectionInput[] = Array.from({ length: sectionCount }, (_, index) => ({
      id: `s${index}`,
      startsNewPage: startsNewPage && index > 0,
    }));

    const sorted = [...plan].sort(
      (a, b) => (a.section % sectionCount) - (b.section % sectionCount),
    );
    let serial = 0;
    let groupSerial = 0;

    for (const entry of sorted) {
      const sectionId = `s${entry.section % sectionCount}`;
      if (entry.groupSize > 0) {
        const groupId = `g${groupSerial++}`;
        heights.set(`passage:${groupId}`, 15 + (entry.height % 25));
        for (let member = 0; member < entry.groupSize; member += 1) {
          const id = `i${serial++}`;
          heights.set(id, 8 + ((entry.height + member * 7) % 40));
          items.push(item(id, { sectionId, groupId, pinned: entry.pinned && member === 0 }));
        }
      } else {
        const id = `i${serial++}`;
        heights.set(id, entry.height);
        items.push(item(id, { sectionId, pinned: entry.pinned }));
      }
    }

    return {
      items,
      heights,
      sections,
      seed,
      settings: { columns, questionGapMm: gap, mode, columnBalance: balance },
    };
  });
