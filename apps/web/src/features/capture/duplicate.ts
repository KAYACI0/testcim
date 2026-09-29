import { hammingDistance } from '@testcim/image-tools';

export interface DuplicateCandidate {
  readonly id: string;
  readonly sha256: string | null;
  readonly phash: string | null;
}

/**
 * Finds an existing item that's the same image (exact SHA-256) or a very
 * close one (perceptual hash within `phashThreshold` bits), scoped to the
 * items already in the current test (docs/02 §5.1: "aynı SHA-256 veya çok
 * yakın pHash"). Never blocks adding the new item — the caller just shows
 * an inline "bu soru zaten var" notice when this returns non-null.
 */
export function findDuplicate(
  candidates: readonly DuplicateCandidate[],
  sha256: string,
  phash: string,
  phashThreshold = 6,
): string | null {
  const exact = candidates.find((c) => c.sha256 !== null && c.sha256 === sha256);
  if (exact) {
    return exact.id;
  }

  const near = candidates.find(
    (c) => c.phash !== null && hammingDistance(c.phash, phash) <= phashThreshold,
  );
  return near?.id ?? null;
}
