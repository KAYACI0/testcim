'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { QUESTION_TYPES } from '@testcim/shared';
import type { AnswerKey, QuestionType } from '@testcim/shared';

import { RichTextEditor } from '../tiptap/editor';
import { useSaveRichQuestion } from '../use-save-rich-question';

import { OptionRow } from './option-row';
import { QuestionPrintPreview } from './print-preview';

import type { EditorStore } from '../../editor/store';
import type { EditableOption, RichDoc, RichQuestionDraft } from '../types';

import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_DOC: RichDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

function newOption(index: number): EditableOption {
  return { key: crypto.randomUUID(), id: LETTERS[index] ?? String(index + 1), richText: EMPTY_DOC };
}

function isEmptyDoc(doc: RichDoc | null): boolean {
  if (!doc) return true;
  const content = doc.content as readonly { content?: readonly unknown[]; text?: string }[];
  return content.every((node) => !node.content?.length && !('text' in node));
}

export interface QuestionEditorPanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly store: EditorStore;
  readonly testId: string;
  readonly workspaceId: string;
}

/**
 * "Yeni soru yaz" panel (docs/prompts/07 §1): question type switches which
 * answer-key controls show, but the stem/options/explanation always share
 * the one `RichTextEditor`. Saving renders an offscreen `QuestionPrintPreview`
 * to a PNG and hands off to `useSaveRichQuestion`, which reuses the capture
 * pipeline's own op-log path (`store.confirmCaptured`) once the question row
 * exists — a written question and a pasted screenshot end up as the exact
 * same kind of `test_items` row.
 */
export function QuestionEditorPanel({
  open,
  onOpenChange,
  store,
  testId,
  workspaceId,
}: QuestionEditorPanelProps) {
  const t = useTranslations('richEditor.questionEditor');
  const { save } = useSaveRichQuestion({ store, testId, workspaceId });
  const previewRef = useRef<HTMLDivElement>(null);

  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [stemRich, setStemRich] = useState<RichDoc>(EMPTY_DOC);
  const [options, setOptions] = useState<EditableOption[]>([newOption(0), newOption(1)]);
  const [correctOptionId, setCorrectOptionId] = useState('A');
  const [tfValue, setTfValue] = useState<'true' | 'false'>('true');
  const [fillValues, setFillValues] = useState('');
  const [numericValue, setNumericValue] = useState('0');
  const [numericTolerance, setNumericTolerance] = useState('0');
  const [orderSequence, setOrderSequence] = useState('');
  const [matchLeft, setMatchLeft] = useState('');
  const [matchRight, setMatchRight] = useState('');
  const [openRubric, setOpenRubric] = useState('');
  const [points, setPoints] = useState(1);
  const [explanationRich, setExplanationRich] = useState<RichDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setQuestionType('mcq');
    setStemRich(EMPTY_DOC);
    setOptions([newOption(0), newOption(1)]);
    setCorrectOptionId('A');
    setTfValue('true');
    setFillValues('');
    setNumericValue('0');
    setNumericTolerance('0');
    setOrderSequence('');
    setMatchLeft('');
    setMatchRight('');
    setOpenRubric('');
    setPoints(1);
    setExplanationRich(null);
    setError(null);
  }

  function buildCorrect(): AnswerKey | null {
    switch (questionType) {
      case 'mcq':
        return { question_type: 'mcq', option_id: correctOptionId };
      case 'tf':
        return { question_type: 'tf', value: tfValue === 'true' };
      case 'fill':
        return {
          question_type: 'fill',
          values: fillValues
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        };
      case 'match':
        return {
          question_type: 'match',
          pairs: matchLeft
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .map((left, index) => ({ left, right: matchRight.split(',')[index]?.trim() ?? '' })),
        };
      case 'open':
        return { question_type: 'open', rubric: openRubric || undefined };
      case 'numeric':
        return {
          question_type: 'numeric',
          value: Number(numericValue),
          tolerance: Number(numericTolerance) || 0,
        };
      case 'order':
        return {
          question_type: 'order',
          sequence: orderSequence
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        };
      default:
        return null;
    }
  }

  async function handleSave() {
    if (isEmptyDoc(stemRich)) {
      setError(t('stemLabel'));
      return;
    }
    setSaving(true);
    setError(null);

    const draft: RichQuestionDraft = {
      questionType,
      stemRich,
      options: questionType === 'mcq' || questionType === 'order' ? options : [],
      correct: buildCorrect(),
      points,
      explanationRich: isEmptyDoc(explanationRich) ? null : explanationRich,
    };

    const element = previewRef.current;
    if (!element) {
      setSaving(false);
      return;
    }

    const result = await save(draft, element);
    setSaving(false);

    if (result.ok) {
      reset();
      onOpenChange(false);
    } else {
      setError(result.reason ?? 'error');
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <SheetContent
        title={t('panelTitle')}
        closeLabel={t('cancel')}
        className="max-w-2xl overflow-y-auto"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="question-type">
              {t('questionType')}
            </label>
            <Select value={questionType} onValueChange={(v) => setQuestionType(v as QuestionType)}>
              <SelectTrigger id="question-type">
                <SelectValue>{t(`questionTypes.${questionType}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`questionTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">{t('stemLabel')}</p>
            <RichTextEditor content={stemRich} onChange={setStemRich} placeholder="" />
          </div>

          {(questionType === 'mcq' || questionType === 'order') && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">{t('optionsLabel')}</p>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <OptionRow
                    key={option.key}
                    option={option}
                    index={index}
                    removable={options.length > 2}
                    onChange={(richText) =>
                      setOptions((prev) =>
                        prev.map((o) => (o.key === option.key ? { ...o, richText } : o)),
                      )
                    }
                    onRemove={() => setOptions((prev) => prev.filter((o) => o.key !== option.key))}
                  />
                ))}
              </div>
              {options.length < 6 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => setOptions((prev) => [...prev, newOption(prev.length)])}
                >
                  {t('addOption')}
                </Button>
              )}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">{t('correctAnswer')}</p>
            {questionType === 'mcq' && (
              <Segmented
                aria-label={t('correctAnswer')}
                value={correctOptionId}
                onValueChange={setCorrectOptionId}
                options={options.map((_, index) => ({
                  value: LETTERS[index] ?? String(index + 1),
                  label: LETTERS[index] ?? String(index + 1),
                }))}
              />
            )}
            {questionType === 'tf' && (
              <Segmented
                aria-label={t('correctAnswer')}
                value={tfValue}
                onValueChange={(v) => setTfValue(v as 'true' | 'false')}
                options={[
                  { value: 'true', label: t('trueLabel') },
                  { value: 'false', label: t('falseLabel') },
                ]}
              />
            )}
            {questionType === 'fill' && (
              <Textarea
                value={fillValues}
                onChange={(e) => setFillValues(e.target.value)}
                rows={2}
              />
            )}
            {questionType === 'order' && (
              <Textarea
                value={orderSequence}
                onChange={(e) => setOrderSequence(e.target.value)}
                rows={2}
                placeholder={t('orderSequenceLabel')}
              />
            )}
            {questionType === 'match' && (
              <div className="grid grid-cols-2 gap-2">
                <Textarea
                  value={matchLeft}
                  onChange={(e) => setMatchLeft(e.target.value)}
                  rows={2}
                  placeholder={t('matchLeftLabel')}
                />
                <Textarea
                  value={matchRight}
                  onChange={(e) => setMatchRight(e.target.value)}
                  rows={2}
                  placeholder={t('matchRightLabel')}
                />
              </div>
            )}
            {questionType === 'numeric' && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={numericValue}
                  onChange={(e) => setNumericValue(e.target.value)}
                  placeholder={t('numericValue')}
                />
                <Input
                  type="number"
                  value={numericTolerance}
                  onChange={(e) => setNumericTolerance(e.target.value)}
                  placeholder={t('numericTolerance')}
                />
              </div>
            )}
            {questionType === 'open' && (
              <Textarea
                value={openRubric}
                onChange={(e) => setOpenRubric(e.target.value)}
                rows={2}
                placeholder={t('openRubricLabel')}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-ink" htmlFor="question-points">
              {t('points')}
            </label>
            <Input
              id="question-points"
              type="number"
              min={0}
              step="0.5"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value) || 0)}
              className="w-24"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">{t('explanationLabel')}</p>
            <RichTextEditor
              content={explanationRich}
              onChange={setExplanationRich}
              placeholder=""
              variant="passage"
            />
          </div>

          {error && <InlineNotice tone="err">{error}</InlineNotice>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={() => void handleSave()} loading={saving}>
              {t('save')}
            </Button>
          </div>
        </div>

        <div className="pointer-events-none fixed top-0 -left-[10000px]" aria-hidden>
          <div ref={previewRef}>
            <QuestionPrintPreview
              stemRich={stemRich}
              options={questionType === 'mcq' ? options : []}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
