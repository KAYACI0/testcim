export interface OnlineExamRow {
  readonly id: string;
  readonly test_id: string;
  readonly title: string;
  readonly mode: 'async' | 'live';
  readonly access: 'link' | 'code' | 'roster';
  readonly join_code: string | null;
  readonly slug: string;
  readonly opens_at: string | null;
  readonly closes_at: string | null;
  readonly duration_sec: number | null;
  readonly max_attempts: number | null;
  readonly shuffle_questions: boolean;
  readonly shuffle_options: boolean;
  readonly show_results: 'never' | 'after_submit' | 'after_close';
  readonly show_answers: boolean;
  readonly required_fields: Record<string, unknown>;
  readonly status: 'draft' | 'scheduled' | 'open' | 'closed';
  readonly participant_cap: number | null;
  readonly created_at: string;
}

export interface ExamAttemptRow {
  readonly id: string;
  readonly online_exam_id: string;
  readonly display_name: string | null;
  readonly student_no: string | null;
  readonly class_label: string | null;
  readonly started_at: string | null;
  readonly deadline_at: string | null;
  readonly submitted_at: string | null;
  readonly status: 'in_progress' | 'submitted' | 'expired';
  readonly flags: Record<string, unknown>;
  readonly score: number | null;
  readonly max_score: number | null;
}
