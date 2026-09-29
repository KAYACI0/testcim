import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale } from './locale';
import { roleSchema, uuidSchema } from './schemas';

describe('uuidSchema', () => {
  it('accepts a uuid', () => {
    expect(uuidSchema.safeParse('1f5b0d9e-6a3c-4f2e-8b7a-9c0d1e2f3a4b').success).toBe(true);
  });

  it('rejects a non-uuid', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
  });
});

describe('roleSchema', () => {
  it('accepts a known role', () => {
    expect(roleSchema.parse('editor')).toBe('editor');
  });

  it('rejects an unknown role', () => {
    expect(roleSchema.safeParse('superuser').success).toBe(false);
  });
});

describe('locale', () => {
  it('defaults to Turkish', () => {
    expect(DEFAULT_LOCALE).toBe('tr');
  });

  it('narrows known locales', () => {
    expect(isLocale('tr')).toBe(true);
    expect(isLocale('de')).toBe(false);
  });
});
