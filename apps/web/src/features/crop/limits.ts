/**
 * Upload/validation ceilings from docs/adr/0003-pdf-kirpma-studyosu.md §1.
 * Shared by the client upload hook (which chooses direct vs. TUS upload)
 * and the server action (which enforces the same numbers again — the
 * client-side choice is only a UX optimization, never trusted alone).
 */
export const MAX_SOURCE_DOCUMENT_PAGES = 60;
export const MAX_SOURCE_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const TUS_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

export const ACCEPTED_SOURCE_DOCUMENT_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const;

export type AcceptedSourceDocumentMime = (typeof ACCEPTED_SOURCE_DOCUMENT_MIME)[number];
