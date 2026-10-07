import { describe, expect, it } from 'vitest';

import { buildDraftFields } from './draft-rows';

const base = {
  stem: 'Soru $x$',
  options: ['bir', 'iki', 'üç', 'dört'],
  correctOptionId: 'B',
  trueFalseValue: null,
  explanation: 'Çözüm',
  difficulty: 3,
};

describe('buildDraftFields', () => {
  it('always produces an unapproved AI draft', () => {
    for (const type of ['mcq', 'tf', 'open'] as const) {
      const row = buildDraftFields(type, { ...base, trueFalseValue: true });
      expect(row.ai_generated).toBe(true);
      expect(row.ai_review_status).toBe('draft');
      expect(row.kind).toBe('rich');
    }
  });

  it('builds lettered options and an mcq answer key', () => {
    const row = buildDraftFields('mcq', base);
    expect(row.options.map((option) => option.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(row.option_count).toBe(4);
    expect(row.correct).toEqual({ question_type: 'mcq', option_id: 'B' });
    expect(row.stem_text).toBe('Soru $x$');
  });

  it('stores true/false without options', () => {
    const row = buildDraftFields('tf', { ...base, options: [], trueFalseValue: false });
    expect(row.options).toEqual([]);
    expect(row.option_count).toBeNull();
    expect(row.correct).toEqual({ question_type: 'tf', value: false });
  });

  it('keeps the explanation as the rubric of an open question', () => {
    const row = buildDraftFields('open', { ...base, options: [], correctOptionId: null });
    expect(row.correct).toEqual({ question_type: 'open', rubric: 'Çözüm' });
    expect(row.explanation_rich).not.toBeNull();
  });
});
