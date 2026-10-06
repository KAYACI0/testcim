import { describe, expect, it } from 'vitest';

import { paginate } from './paginate';

describe('paginate', () => {
  it('returns one empty page when there are no questions', () => {
    const pages = paginate({ heights: [], columns: 2, firstPageHeight: 500, otherPageHeight: 800 });
    expect(pages).toEqual([{ columns: [[], []] }]);
  });

  it('fills the left column top to bottom before the right column', () => {
    const pages = paginate({
      heights: [100, 100, 100, 100, 100, 100],
      columns: 2,
      firstPageHeight: 300,
      otherPageHeight: 300,
    });
    expect(pages).toEqual([
      {
        columns: [
          [0, 1, 2],
          [3, 4, 5],
        ],
      },
    ]);
  });

  it('opens a new page once both columns are full', () => {
    const pages = paginate({
      heights: [100, 100, 100, 100, 100],
      columns: 2,
      firstPageHeight: 200,
      otherPageHeight: 400,
    });
    expect(pages).toEqual([
      {
        columns: [
          [0, 1],
          [2, 3],
        ],
      },
      { columns: [[4], []] },
    ]);
  });

  it('uses the larger body height on pages after the first', () => {
    const pages = paginate({
      heights: [150, 150, 150, 150, 150, 150, 150],
      columns: 1,
      firstPageHeight: 300,
      otherPageHeight: 450,
    });
    expect(pages.map((page) => page.columns[0])).toEqual([
      [0, 1],
      [2, 3, 4],
      [5, 6],
    ]);
  });

  it('places a block taller than a column instead of dropping it', () => {
    const pages = paginate({
      heights: [900, 100],
      columns: 1,
      firstPageHeight: 300,
      otherPageHeight: 300,
    });
    expect(pages).toEqual([{ columns: [[0]] }, { columns: [[1]] }]);
  });

  it('keeps document order and uses every item exactly once', () => {
    const heights = Array.from({ length: 37 }, (_, i) => 60 + ((i * 37) % 140));
    const pages = paginate({ heights, columns: 2, firstPageHeight: 500, otherPageHeight: 800 });
    const flat = pages.flatMap((page) => page.columns.flat());
    expect(flat).toEqual(heights.map((_, i) => i));
  });

  it('never exceeds the page body height unless a single block is taller', () => {
    const heights = Array.from({ length: 50 }, (_, i) => 80 + ((i * 53) % 120));
    const pages = paginate({ heights, columns: 2, firstPageHeight: 600, otherPageHeight: 900 });
    pages.forEach((page, pageIndex) => {
      const capacity = pageIndex === 0 ? 600 : 900;
      page.columns.forEach((column) => {
        const total = column.reduce((sum, i) => sum + (heights[i] as number), 0);
        expect(total).toBeLessThanOrEqual(capacity);
      });
    });
  });
});
