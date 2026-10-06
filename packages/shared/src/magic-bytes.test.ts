import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { detectFileKind, matchesDeclaredMime } from './magic-bytes';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

describe('detectFileKind', () => {
  it('recognises the supported signatures', () => {
    expect(detectFileKind(new Uint8Array(PNG))).toBe('png');
    expect(detectFileKind(new Uint8Array(JPEG))).toBe('jpeg');
    expect(detectFileKind(new Uint8Array(PDF))).toBe('pdf');
    expect(detectFileKind(new Uint8Array(WEBP))).toBe('webp');
  });

  it('rejects executables, HTML and empty input', () => {
    expect(detectFileKind(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
    expect(detectFileKind(new TextEncoder().encode('<html><script>'))).toBeNull();
    expect(detectFileKind(new Uint8Array([]))).toBeNull();
  });

  it('rejects a RIFF container that is not WebP', () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45];
    expect(detectFileKind(new Uint8Array(wav))).toBeNull();
  });

  it('never throws and only returns known kinds for arbitrary bytes', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 64 }), (bytes) => {
        const kind = detectFileKind(bytes);
        expect([null, 'pdf', 'png', 'jpeg', 'webp']).toContain(kind);
      }),
    );
  });
});

describe('matchesDeclaredMime', () => {
  it('accepts a matching declaration', () => {
    expect(matchesDeclaredMime(new Uint8Array(PNG), 'image/png')).toBe(true);
    expect(matchesDeclaredMime(new Uint8Array(PDF), 'application/pdf')).toBe(true);
  });

  it('rejects a spoofed declaration', () => {
    expect(matchesDeclaredMime(new Uint8Array(PDF), 'image/png')).toBe(false);
    expect(matchesDeclaredMime(new Uint8Array([0x4d, 0x5a]), 'image/png')).toBe(false);
  });
});
