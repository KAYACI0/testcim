'use client';

import type { AnswerKey } from '@testcim/shared';

import { Segmented } from '@/components/ui/segmented';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function AnswerSelector({
  correct,
  optionCount = 5,
  label,
  onChange,
}: {
  readonly correct: AnswerKey | null;
  readonly optionCount?: number;
  readonly label: string;
  readonly onChange: (correct: AnswerKey | null) => void;
}) {
  const value = correct?.question_type === 'mcq' ? correct.option_id : '';
  const options = LETTERS.slice(0, optionCount).map((letter) => ({ value: letter, label: letter }));

  return (
    <Segmented
      aria-label={label}
      options={options}
      value={value}
      onValueChange={(next) => onChange(next ? { question_type: 'mcq', option_id: next } : null)}
    />
  );
}
