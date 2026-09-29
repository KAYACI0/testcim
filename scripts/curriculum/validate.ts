import type { CurriculumSourceFile } from './types';

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
}

/**
 * Pure structural check on a curriculum data file: every topic must belong
 * to the file's own subject/grade range, and every outcome must point at a
 * topic that exists in the same file. Catches copy-paste mistakes in the
 * hand-curated JSON before they reach the database (docs/prompts/08:
 * "uydurma MEB kazanımı yazma" — bad structure is the more likely mistake
 * once the source text itself is real).
 */
export function validateCurriculumFile(file: CurriculumSourceFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const topicCodes = new Set(file.topics.map((t) => t.code));

  for (const topic of file.topics) {
    if (topic.grade < file.subject.grade_from || topic.grade > file.subject.grade_to) {
      issues.push({
        code: topic.code,
        message: `grade ${topic.grade} is outside subject range ${file.subject.grade_from}-${file.subject.grade_to}`,
      });
    }
    if (topic.parent_code && !topicCodes.has(topic.parent_code)) {
      issues.push({
        code: topic.code,
        message: `parent_code ${topic.parent_code} not found in file`,
      });
    }
  }

  const seenOutcomeCodes = new Set<string>();
  for (const outcome of file.outcomes) {
    if (seenOutcomeCodes.has(outcome.code)) {
      issues.push({ code: outcome.code, message: 'duplicate outcome code within file' });
    }
    seenOutcomeCodes.add(outcome.code);

    if (!topicCodes.has(outcome.topic_code)) {
      issues.push({
        code: outcome.code,
        message: `topic_code ${outcome.topic_code} not found in file`,
      });
    }
    if (outcome.grade < file.subject.grade_from || outcome.grade > file.subject.grade_to) {
      issues.push({
        code: outcome.code,
        message: `grade ${outcome.grade} is outside subject range ${file.subject.grade_from}-${file.subject.grade_to}`,
      });
    }
    if (!outcome.description.trim()) {
      issues.push({ code: outcome.code, message: 'empty description' });
    }
  }

  return issues;
}
