export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A 3x3 projective transform, stored as [h11, h12, h13, h21, h22, h23, h31, h32] (h33 = 1). */
export type Homography = readonly [number, number, number, number, number, number, number, number];

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const n = vector.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]!]);

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(augmented[row]![col]!) > Math.abs(augmented[pivotRow]![col]!)) {
        pivotRow = row;
      }
    }
    [augmented[col], augmented[pivotRow]] = [augmented[pivotRow]!, augmented[col]!];

    const pivot = augmented[col]![col]!;
    if (Math.abs(pivot) < 1e-12) {
      throw new RangeError('Corner points are degenerate: no unique homography.');
    }
    for (let k = col; k <= n; k += 1) {
      augmented[col]![k] = augmented[col]![k]! / pivot;
    }
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = augmented[row]![col]!;
      for (let k = col; k <= n; k += 1) {
        augmented[row]![k] = augmented[row]![k]! - factor * augmented[col]![k]!;
      }
    }
  }

  return augmented.map((row) => row[n]!);
}

/**
 * Solves the projective transform mapping each `from` point to the corresponding `to`
 * point (both arrays length 4, standard order: top-left, top-right, bottom-left,
 * bottom-right). Used to map template millimetre coordinates onto the pixel positions
 * of the four detected corner marks, tolerating rotation, skew, and perspective.
 */
export function solveHomography(from: readonly Point[], to: readonly Point[]): Homography {
  if (from.length !== 4 || to.length !== 4) {
    throw new RangeError('solveHomography requires exactly 4 point correspondences.');
  }

  const matrix: number[][] = [];
  const vector: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const { x, y } = from[i]!;
    const { x: u, y: v } = to[i]!;
    matrix.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    vector.push(u);
    matrix.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    vector.push(v);
  }

  const [h11, h12, h13, h21, h22, h23, h31, h32] = solveLinearSystem(matrix, vector);
  return [h11!, h12!, h13!, h21!, h22!, h23!, h31!, h32!];
}

export function applyHomography(h: Homography, point: Point): Point {
  const [h11, h12, h13, h21, h22, h23, h31, h32] = h;
  const denom = h31 * point.x + h32 * point.y + 1;
  return {
    x: (h11 * point.x + h12 * point.y + h13) / denom,
    y: (h21 * point.x + h22 * point.y + h23) / denom,
  };
}
