/**
 * mulberry32: a small, dependency-free 32-bit PRNG. Deterministic for a given seed,
 * which is what makes a booklet reproducible from `(seed, versionCode)` alone.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Index of a booklet code: 'A' is 0, 'B' is 1, and so on. */
export function versionIndex(versionCode: string): number {
  const code = versionCode.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  if (versionCode.length !== 1 || code < 0 || code > 25) {
    throw new RangeError(`Invalid booklet version code: "${versionCode}"`);
  }
  return code;
}

/** Each version gets its own stream; golden-ratio mixing keeps nearby seeds apart. */
export function versionSeed(baseSeed: number, versionCode: string): number {
  return (baseSeed + versionIndex(versionCode) * 0x9e3779b9) >>> 0;
}

/** Fisher-Yates over a copy. */
export function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}
