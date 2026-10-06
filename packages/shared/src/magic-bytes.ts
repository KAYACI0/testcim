export type DetectedFileKind = 'pdf' | 'png' | 'jpeg' | 'webp';

export const FILE_KIND_MIME = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
} as const satisfies Record<DetectedFileKind, string>;

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

/**
 * Identifies an uploaded file by its leading bytes, ignoring the declared
 * extension and MIME type (both are client-controlled). Returns `null` for
 * anything that is not a PDF, PNG, JPEG or WebP.
 */
export function detectFileKind(bytes: Uint8Array): DetectedFileKind | null {
  // "%PDF-"
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  // 89 "PNG" 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  // "RIFF" <size> "WEBP"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'webp';
  }
  return null;
}

/** True when the file's real content matches the MIME type the client declared. */
export function matchesDeclaredMime(bytes: Uint8Array, declaredMime: string): boolean {
  const kind = detectFileKind(bytes);
  return kind !== null && FILE_KIND_MIME[kind] === declaredMime;
}
