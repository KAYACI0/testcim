import { describe, expect, it } from 'vitest';

import { createCaptureSessionSchema, mobileCaptureSubmitSchema } from './capture-session';

describe('capture session schemas', () => {
  it('validates createCaptureSessionSchema', () => {
    const valid = {
      testId: '123e4567-e89b-12d3-a456-426614174000',
      deviceType: 'phone',
    };
    expect(createCaptureSessionSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      testId: 'not-a-uuid',
      deviceType: 'smartwatch',
    };
    expect(createCaptureSessionSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates mobileCaptureSubmitSchema', () => {
    const valid = {
      token: '12345678901234567890',
      itemId: '123e4567-e89b-12d3-a456-426614174001',
      position: 'a0',
      path: 'ws123/2026/img.png',
      mime: 'image/png',
      bytes: 1024,
      width: 800,
      height: 600,
      sha256: 'a'.repeat(64),
      phash: 'b'.repeat(16),
      answer: 'C',
    };
    expect(mobileCaptureSubmitSchema.safeParse(valid).success).toBe(true);

    const shortToken = {
      ...valid,
      token: 'short',
    };
    expect(mobileCaptureSubmitSchema.safeParse(shortToken).success).toBe(false);
  });
});
