import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale } from './locale';
import {
  answerKeySchema,
  brandingSchema,
  drawingAttrsSchema,
  entitlementsSchema,
  equationAttrsSchema,
  questionOptionsSchema,
  RICH_DOC_MAX_BYTES,
  richDocSchema,
  roleSchema,
  testHeaderSettingsSchema,
  testOpSchema,
  testSettingsSchema,
  resolveHeaderSettings,
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

  it('accepts a string header', () => {
    const parsed = testSettingsSchema.parse({ ...base, header: 'Custom School' });
    expect(parsed.header).toBe('Custom School');
  });

  it('accepts a structured header object with defaults', () => {
    const headerDirect = testHeaderSettingsSchema.parse({ schoolName: 'Ataturk Lisesi' });
    expect(headerDirect.schoolName).toBe('Ataturk Lisesi');
    expect(headerDirect.showStudentName).toBe(true);

    const parsed = testSettingsSchema.parse({
      ...base,
      header: {
        schoolName: 'Ataturk Lisesi',
        showStudentName: true,
        showStudentNo: true,
        showClass: true,
      },
    });
    expect(typeof parsed.header).toBe('object');
    expect((parsed.header as { schoolName?: string }).schoolName).toBe('Ataturk Lisesi');
  });

  it('resolves header settings from string or object or empty', () => {
    const fromEmpty = resolveHeaderSettings(undefined, 'Default Test');
    expect(fromEmpty.title).toBe('Default Test');
    expect(fromEmpty.showStudentName).toBe(true);
    expect(fromEmpty.showClass).toBe(true);

    const fromString = resolveHeaderSettings('Sample School', 'Test Title');
    expect(fromString.schoolName).toBe('Sample School');
    expect(fromString.title).toBe('Test Title');

    const fromObj = resolveHeaderSettings({ schoolName: 'Test School', showScore: false });
    expect(fromObj.schoolName).toBe('Test School');
    expect(fromObj.showScore).toBe(false);
    expect(fromObj.showStudentName).toBe(true);
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

describe('testOpSchema', () => {
  it('accepts add_group with a passage_rich doc', () => {
    const op = {
      type: 'add_group',
      group_id: '1f5b0d9e-6a3c-4f2e-8b7a-9c0d1e2f3a4b',
      passage_rich: { type: 'doc', content: [] },
    };
    expect(testOpSchema.safeParse(op).success).toBe(true);
  });

  it('accepts update_group with only passage_asset_id', () => {
    const op = {
      type: 'update_group',
      group_id: '1f5b0d9e-6a3c-4f2e-8b7a-9c0d1e2f3a4b',
      passage_asset_id: '1f5b0d9e-6a3c-4f2e-8b7a-9c0d1e2f3a4b',
    };
    expect(testOpSchema.safeParse(op).success).toBe(true);
  });
});

describe('richDocSchema', () => {
  it('accepts a minimal TipTap doc and keeps unknown node fields (loose envelope)', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Soru' }] }],
    };
    const result = richDocSchema.parse(doc);
    expect(result.content).toHaveLength(1);
  });

  it('rejects a document over the byte ceiling', () => {
    const doc = { type: 'doc', content: [{ type: 'text', text: 'x'.repeat(RICH_DOC_MAX_BYTES) }] };
    expect(richDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a non-doc envelope', () => {
    expect(richDocSchema.safeParse({ type: 'paragraph', content: [] }).success).toBe(false);
  });
});

describe('equationAttrsSchema', () => {
  it('round-trips a LaTeX fraction', () => {
    const attrs = { latex: '\\frac{1}{2}', altText: 'bir bölü iki' };
    expect(equationAttrsSchema.parse(attrs)).toEqual(attrs);
  });

  it('rejects an empty latex string', () => {
    expect(equationAttrsSchema.safeParse({ latex: '' }).success).toBe(false);
  });
});

describe('drawingAttrsSchema', () => {
  it('accepts a scene with a couple of tool objects', () => {
    const attrs = {
      scene: {
        version: 1,
        width: 400,
        height: 300,
        objects: [
          { id: 'o1', tool: 'line', points: [0, 0, 100, 100] },
          { id: 'o2', tool: 'point-label', x: 10, y: 10, label: 'A' },
        ],
      },
      svg: '<svg></svg>',
    };
    expect(drawingAttrsSchema.safeParse(attrs).success).toBe(true);
  });

  it('rejects a scene object missing its tool discriminant', () => {
    const attrs = {
      scene: { version: 1, width: 100, height: 100, objects: [{ id: 'o1' }] },
      svg: '<svg></svg>',
    };
    expect(drawingAttrsSchema.safeParse(attrs).success).toBe(false);
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
