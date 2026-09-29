import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale } from './locale';
import {
  answerKeySchema,
  brandingSchema,
  entitlementsSchema,
  questionOptionsSchema,
  roleSchema,
  testSettingsSchema,
  uuidSchema,
} from './schemas';

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

describe('entitlementsSchema', () => {
  const freePlan = {
    questions_per_test: 20,
    pdf_exports_per_month: 10,
    versions_per_test: 2,
    bank_questions: 100,
    storage_mb: 250,
    ai_credits_per_month: 10,
    omr_scans_per_month: 30,
    online_participants_per_exam: 20,
    live_exams_concurrent: 1,
    advanced_layout: 'basic',
    remove_branding: false,
    docx_pptx_export: false,
    iframe_embed: false,
    seats: 1,
    api_webhooks: false,
  };

  it('accepts the free plan shape', () => {
    expect(entitlementsSchema.safeParse(freePlan).success).toBe(true);
  });

  it('accepts -1 as the unlimited sentinel', () => {
    expect(entitlementsSchema.safeParse({ ...freePlan, pdf_exports_per_month: -1 }).success).toBe(
      true,
    );
  });

  it('rejects an unknown advanced_layout value', () => {
    expect(entitlementsSchema.safeParse({ ...freePlan, advanced_layout: 'tam' }).success).toBe(
      false,
    );
  });
});

describe('brandingSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(brandingSchema.safeParse({}).success).toBe(true);
  });
});

describe('testSettingsSchema', () => {
  const base = {
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    columnGap: 4,
    questionGap: 3,
  };

  it('applies defaults for optional fields', () => {
    const result = testSettingsSchema.parse(base);
    expect(result.pageSize).toBe('a4');
    expect(result.layoutMode).toBe('strict');
    expect(result.fitPagesScaleMin).toBe(0.85);
  });

  it('rejects a questionGap below the 3mm floor', () => {
    expect(testSettingsSchema.safeParse({ ...base, questionGap: 2 }).success).toBe(false);
  });

  it('rejects more than 3 columns', () => {
    expect(testSettingsSchema.safeParse({ ...base, columns: 4 }).success).toBe(false);
  });
});

describe('questionOptionsSchema', () => {
  it('accepts a list of mcq options', () => {
    const options = [
      { id: 'a', text: '3' },
      { id: 'b', text: '4' },
    ];
    expect(questionOptionsSchema.safeParse(options).success).toBe(true);
  });
});

describe('answerKeySchema', () => {
  it('accepts an mcq answer', () => {
    expect(answerKeySchema.safeParse({ question_type: 'mcq', option_id: 'b' }).success).toBe(true);
  });

  it('accepts a numeric answer with a default tolerance', () => {
    const result = answerKeySchema.parse({ question_type: 'numeric', value: 42 });
    expect(result).toEqual({ question_type: 'numeric', value: 42, tolerance: 0 });
  });

  it('rejects a mismatched shape for the given question_type', () => {
    expect(answerKeySchema.safeParse({ question_type: 'tf', option_id: 'b' }).success).toBe(false);
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
