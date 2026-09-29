'use client';

import { useTranslations } from 'next-intl';

import type { BankFilter, QuestionType } from '@testcim/shared';
import { QUESTION_TYPES } from '@testcim/shared';

import type { TagRow } from './actions.server';
import type { CurriculumOutcomeRow, CurriculumSubjectRow, CurriculumTopicRow } from './types';

import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterBarProps {
  readonly filter: BankFilter;
  readonly onChange: (next: BankFilter) => void;
  readonly subjects: readonly CurriculumSubjectRow[];
  readonly topics: readonly CurriculumTopicRow[];
  readonly outcomes: readonly CurriculumOutcomeRow[];
  readonly tags: readonly TagRow[];
}

export function FilterBar({ filter, onChange, subjects, topics, outcomes, tags }: FilterBarProps) {
  const t = useTranslations('bank.filters');

  const topicsForSubject = filter.subjectId
    ? topics.filter((topic) => topic.subject_id === filter.subjectId)
    : topics;
  const outcomesForTopic = filter.topicId
    ? outcomes.filter((outcome) => outcome.topic_id === filter.topicId)
    : filter.subjectId
      ? outcomes.filter((outcome) => outcome.subject_id === filter.subjectId)
      : outcomes;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
      <div className="relative min-w-56 flex-1">
        <Input
          value={filter.search ?? ''}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
        />
      </div>

      <Combobox
        options={subjects.map((s) => ({ value: s.id, label: s.name }))}
        value={filter.subjectId ?? null}
        onValueChange={(value) =>
          onChange({
            ...filter,
            subjectId: value || undefined,
            topicId: undefined,
            outcomeId: undefined,
          })
        }
        placeholder={t('subjectPlaceholder')}
        searchPlaceholder={t('searchPlaceholder')}
        emptyMessage={t('emptyOptions')}
        className="w-40"
      />

      <Combobox
        options={topicsForSubject.map((topicRow) => ({ value: topicRow.id, label: topicRow.name }))}
        value={filter.topicId ?? null}
        onValueChange={(value) =>
          onChange({ ...filter, topicId: value || undefined, outcomeId: undefined })
        }
        placeholder={t('topicPlaceholder')}
        searchPlaceholder={t('searchPlaceholder')}
        emptyMessage={t('emptyOptions')}
        className="w-40"
      />

      <Combobox
        options={outcomesForTopic.map((outcomeRow) => ({
          value: outcomeRow.id,
          label: outcomeRow.code
            ? `${outcomeRow.code} ${outcomeRow.description}`
            : outcomeRow.description,
        }))}
        value={filter.outcomeId ?? null}
        onValueChange={(value) => onChange({ ...filter, outcomeId: value || undefined })}
        placeholder={t('outcomePlaceholder')}
        searchPlaceholder={t('searchPlaceholder')}
        emptyMessage={t('emptyOptions')}
        className="w-48"
      />

      <Select
        value={filter.questionType ?? ''}
        onValueChange={(value) =>
          onChange({ ...filter, questionType: (value || undefined) as QuestionType | undefined })
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder={t('typePlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {QUESTION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {t(`types.${type}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Segmented
        aria-label={t('difficultyLabel')}
        options={[
          { value: '', label: t('difficultyAny') },
          ...[1, 2, 3, 4, 5].map((d) => ({ value: String(d), label: String(d) })),
        ]}
        value={filter.difficulty ? String(filter.difficulty) : ''}
        onValueChange={(value) =>
          onChange({ ...filter, difficulty: value ? Number(value) : undefined })
        }
      />

      <Combobox
        options={tags.map((tagRow) => ({ value: tagRow.id, label: tagRow.name }))}
        value={filter.tagIds?.[0] ?? null}
        onValueChange={(value) => onChange({ ...filter, tagIds: value ? [value] : undefined })}
        placeholder={t('tagPlaceholder')}
        searchPlaceholder={t('searchPlaceholder')}
        emptyMessage={t('emptyOptions')}
        className="w-36"
      />

      <Select
        value={filter.aiStatus ?? ''}
        onValueChange={(value) =>
          onChange({
            ...filter,
            aiStatus: (value || undefined) as 'draft' | 'approved' | undefined,
          })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder={t('aiStatusPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">{t('aiStatusDraft')}</SelectItem>
          <SelectItem value="approved">{t('aiStatusApproved')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
