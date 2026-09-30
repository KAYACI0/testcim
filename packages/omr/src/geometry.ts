/** A single answer bubble, positioned in millimetres from the form origin. */
export interface BubbleCell {
  readonly row: number;
  readonly column: number;
  readonly x: number;
  readonly y: number;
  readonly diameter: number;
}

export interface BubbleGridSpec {
  readonly rows: number;
  readonly columns: number;
  readonly originX: number;
  readonly originY: number;
  readonly pitchX: number;
  readonly pitchY: number;
  readonly diameter: number;
}

/**
 * Lays out a bubble grid. Pure geometry: the reader and the form generator share it so a
 * scanned sheet is measured against exactly the coordinates that were printed.
 */
export function bubbleGrid(spec: BubbleGridSpec): BubbleCell[] {
  if (!Number.isInteger(spec.rows) || !Number.isInteger(spec.columns)) {
    throw new RangeError('Row and column counts must be integers.');
  }
  if (spec.rows < 0 || spec.columns < 0) {
    throw new RangeError('Row and column counts must not be negative.');
  }

  const cells: BubbleCell[] = [];

  for (let row = 0; row < spec.rows; row += 1) {
    for (let column = 0; column < spec.columns; column += 1) {
      cells.push({
        row,
        column,
        x: spec.originX + column * spec.pitchX,
        y: spec.originY + row * spec.pitchY,
        diameter: spec.diameter,
      });
    }
  }

  return cells;
}
