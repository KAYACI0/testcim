'use client';

import { useTranslations } from 'next-intl';

import type { RichDoc } from '@testcim/shared';

import { RichTextEditor } from '../tiptap/editor';

import type { EditableOption } from '../types';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export function OptionRow({
  option,
  index,
  onChange,
  onRemove,
  removable,
}: {
  readonly option: EditableOption;
  readonly index: number;
  readonly onChange: (richText: RichDoc) => void;
  readonly onRemove: () => void;
  readonly removable: boolean;
}) {
  const t = useTranslations('richEditor.questionEditor');

  return (
    <div className="flex items-start gap-2">
      <span className="mt-2 w-5 shrink-0 text-sm font-medium text-ink-2">
        {LETTERS[index] ?? index + 1}
      </span>
      <div className="flex-1">
        <RichTextEditor
          variant="passage"
          content={(option.richText as RichDoc) ?? null}
          onChange={onChange}
          placeholder=""
        />
      </div>
      <IconButton
        label={t('removeOption')}
        onClick={onRemove}
        disabled={!removable}
        className="mt-1"
      >
        <Icon name="x" size={16} />
      </IconButton>
    </div>
  );
}
