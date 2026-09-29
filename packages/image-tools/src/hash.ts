import { assertValidImage, type RawImage } from './raw-image';

interface SubtleCryptoLike {
  digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
}

/**
 * SHA-256 of raw bytes, hex-encoded. Uses whatever `crypto.subtle` the host
 * provides (browser, Worker, or Node 20+) via a narrow structural cast —
 * this package's tsconfig has no DOM lib (it must stay usable from plain
 * Node tests), so the global isn't declared, only assumed at runtime.
 */
export async function sha256(bytes: Uint8Array): Promise<string> {
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCryptoLike } }).crypto?.subtle;

  if (!subtle) {
    throw new Error(
      'sha256() needs Web Crypto (globalThis.crypto.subtle), which this runtime lacks.',
    );
  }

  const digest = await subtle.digest('SHA-256', bytes);
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

const PHASH_SIZE = 32;
const PHASH_LOW_FREQ = 8;

/** Precomputed DCT-II basis: `basis[k][n] = cos((pi / N) * (n + 0.5) * k)`. */
function dctBasis(size: number): number[][] {
  const basis: number[][] = [];
  for (let k = 0; k < size; k += 1) {
    const row: number[] = [];
    for (let n = 0; n < size; n += 1) {
      row.push(Math.cos((Math.PI / size) * (n + 0.5) * k));
    }
    basis.push(row);
  }
  return basis;
}

const BASIS = dctBasis(PHASH_SIZE);

/** 1D DCT-II along each row, then each column (separable 2D DCT). */
function dct2d(matrix: number[][]): number[][] {
  const size = matrix.length;
  const rowTransformed: number[][] = [];

  for (let y = 0; y < size; y += 1) {
    const row: number[] = [];
    for (let k = 0; k < size; k += 1) {
      let sum = 0;
      for (let x = 0; x < size; x += 1) {
        sum += matrix[y]![x]! * BASIS[k]![x]!;
      }
      row.push(sum);
    }
    rowTransformed.push(row);
  }

  const result: number[][] = [];
  for (let k = 0; k < size; k += 1) {
    const col: number[] = [];
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      for (let y = 0; y < size; y += 1) {
        sum += rowTransformed[y]![x]! * BASIS[k]![y]!;
      }
      col.push(sum);
    }
    result.push(col);
  }

  return result;
}

/** Area-average downscale to a `size`x`size` grayscale matrix. */
function toGrayscale(image: RawImage, size: number): number[][] {
  const matrix: number[][] = [];

  for (let ty = 0; ty < size; ty += 1) {
    const row: number[] = [];
    const y0 = Math.floor((ty / size) * image.height);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) / size) * image.height));

    for (let tx = 0; tx < size; tx += 1) {
      const x0 = Math.floor((tx / size) * image.width);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) / size) * image.width));

      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1 && y < image.height; y += 1) {
        for (let x = x0; x < x1 && x < image.width; x += 1) {
          const i = (y * image.width + x) * 4;
          // Rec. 601 luma weights.
          sum += 0.299 * image.data[i]! + 0.587 * image.data[i + 1]! + 0.114 * image.data[i + 2]!;
          count += 1;
        }
      }

      row.push(count > 0 ? sum / count : 0);
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Perceptual hash (pHash): grayscale downscale, 2D DCT, threshold the
 * low-frequency 8x8 block against its median. Returns a 16-char hex string
 * (64 bits). Near-duplicate images (recompressed, lightly cropped) land a
 * small `hammingDistance` apart; unrelated images land far apart.
 */
export function pHash(image: RawImage): string {
  assertValidImage(image);
  const gray = toGrayscale(image, PHASH_SIZE);
  const freq = dct2d(gray);

  const lowFreq: number[] = [];
  for (let y = 0; y < PHASH_LOW_FREQ; y += 1) {
    for (let x = 0; x < PHASH_LOW_FREQ; x += 1) {
      lowFreq.push(freq[y]![x]!);
    }
  }

  const sorted = [...lowFreq].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;

  let bits = '';
  let nibble = 0;
  lowFreq.forEach((value, index) => {
    nibble = (nibble << 1) | (value > median ? 1 : 0);
    if (index % 4 === 3) {
      bits += nibble.toString(16);
      nibble = 0;
    }
  });

  return bits;
}

/** Number of differing bits between two same-length hex hashes. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) {
    throw new RangeError('hammingDistance() requires two hashes of equal length.');
  }

  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    distance += diff
      .toString(2)
      .split('')
      .filter((bit) => bit === '1').length;
  }

  return distance;
}
