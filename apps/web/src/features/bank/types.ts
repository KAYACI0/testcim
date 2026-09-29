export interface CurriculumSubjectRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly grade_from: number | null;
  readonly grade_to: number | null;
}

export interface CurriculumTopicRow {
  readonly id: string;
  readonly subject_id: string;
  readonly name: string;
}

export interface CurriculumOutcomeRow {
  readonly id: string;
  readonly subject_id: string;
  readonly topic_id: string | null;
  readonly grade: number | null;
  readonly code: string | null;
  readonly description: string;
}
