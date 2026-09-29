import { describe, expect, it } from 'vitest';

import { validateCurriculumFile } from './validate';

import type { CurriculumSourceFile } from './types';

function baseFile(): CurriculumSourceFile {
  return {
    subject: { code: 'MAT', name: 'Matematik', grade_from: 5, grade_to: 8 },
    topics: [{ code: 'MAT.5.1', name: 'Sayılar', grade: 5, parent_code: null }],
    outcomes: [
      { code: 'MAT.5.1.1', grade: 5, topic_code: 'MAT.5.1', description: 'Bir şey yapabilme' },
    ],
    source: {
      title: 't',
      publisher: 'p',
      url: 'u',
      pdf_url: 'pu',
      accessed_at: '2026-01-01',
      extraction_method: 'm',
      coverage_note: 'c',
    },
  };
}

describe('validateCurriculumFile', () => {
  it('accepts a well-formed file', () => {
    expect(validateCurriculumFile(baseFile())).toEqual([]);
  });

  it('flags an outcome whose topic_code is missing from the file', () => {
    const file = baseFile();
    const issues = validateCurriculumFile({
      ...file,
      outcomes: [{ ...file.outcomes[0]!, topic_code: 'MAT.5.9' }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('MAT.5.9');
  });

  it('flags a topic grade outside the subject range', () => {
    const file = baseFile();
    const issues = validateCurriculumFile({
      ...file,
      topics: [{ ...file.topics[0]!, grade: 9 }],
    });
    expect(issues.some((i) => i.message.includes('outside subject range'))).toBe(true);
  });

  it('flags a duplicate outcome code', () => {
    const file = baseFile();
    const issues = validateCurriculumFile({
      ...file,
      outcomes: [file.outcomes[0]!, file.outcomes[0]!],
    });
    expect(issues.some((i) => i.message.includes('duplicate'))).toBe(true);
  });

  it('flags an empty description', () => {
    const file = baseFile();
    const issues = validateCurriculumFile({
      ...file,
      outcomes: [{ ...file.outcomes[0]!, description: '   ' }],
    });
    expect(issues.some((i) => i.message.includes('empty description'))).toBe(true);
  });
});
