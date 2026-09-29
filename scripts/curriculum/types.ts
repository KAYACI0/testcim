export interface CurriculumSubjectInput {
  readonly code: string;
  readonly name: string;
  readonly grade_from: number;
  readonly grade_to: number;
}

export interface CurriculumTopicInput {
  readonly code: string;
  readonly name: string;
  readonly grade: number;
  readonly parent_code: string | null;
}

export interface CurriculumOutcomeInput {
  readonly code: string;
  readonly grade: number;
  readonly topic_code: string;
  readonly description: string;
}

export interface CurriculumSourceFile {
  readonly subject: CurriculumSubjectInput;
  readonly topics: readonly CurriculumTopicInput[];
  readonly outcomes: readonly CurriculumOutcomeInput[];
  readonly source: {
    readonly title: string;
    readonly publisher: string;
    readonly url: string;
    readonly pdf_url: string;
    readonly accessed_at: string;
    readonly extraction_method: string;
    readonly coverage_note: string;
  };
}
