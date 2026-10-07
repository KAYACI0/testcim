'use client';

import 'katex/dist/katex.min.css';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { uuidv7 } from 'uuidv7';

import { sha256 } from '@testcim/image-tools';
import { OPTION_LETTERS, textToRichDoc } from '@testcim/shared';

import { aiErrorText } from './ai-error';

import type { DraftQuestionRow } from '@/features/ai/question-actions.server';
import type { EditableOption } from '@/features/rich-editor/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  approveDraftQuestion,
  deleteDraftQuestions,
  qualityCheck,
  updateDraftQuestion,
} from '@/features/ai/question-actions.server';
import { QuestionPrintPreview } from '@/features/rich-editor/question-editor/print-preview';
import { richDocToHtml } from '@/features/rich-editor/render/doc-to-html';
import { renderElementToPng } from '@/features/rich-editor/render/render-question';
import { readPngDimensions } from '@/features/rich-editor/use-save-rich-question';
import { createClient } from '@/lib/supabase/client';

const SAVE_DPI = 300;
const COLUMN_WIDTH_MM = 170;

function toEditableOptions(draft: DraftQuestionRow): EditableOption[] {
  return draft.options.map((option) => ({
    key: option.id,
    id: option.id,
    text: option.text,
    richText: textToRichDoc(option.text),
  }));
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

interface EditValues {
  stem: string;
  options: string[];
  correctOptionId: string | null;
  trueFalseValue: boolean | null;
  explanation: string;
}

function Equation({ text }: { readonly text: string }) {
  return (
    <div
      className="[&_p]:my-1"
      dangerouslySetInnerHTML={{ __html: richDocToHtml(textToRichDoc(text)) }}
    />
  );
}

export interface ReviewTrayProps {
  readonly workspaceId: string;
  readonly initialDrafts: readonly DraftQuestionRow[];
  readonly creditCosts: { readonly qualityCheck: number };
}

export function ReviewTray({ workspaceId, initialDrafts, creditCosts }: ReviewTrayProps) {
  const t = useTranslations('ai');
  const [drafts, setDrafts] = useState<readonly DraftQuestionRow[]>(initialDrafts);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [rendering, setRendering] = useState<DraftQuestionRow | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  function setBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function removeDrafts(ids: readonly string[]) {
    const gone = new Set(ids);
    setDrafts((current) => current.filter((draft) => !gone.has(draft.id)));
    setSelected((current) => new Set([...current].filter((id) => !gone.has(id))));
  }

  /** Renders the draft to a 300 DPI PNG in the browser, uploads it straight to Storage and approves it. */
  async function approveOne(
    draft: DraftQuestionRow,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    flushSync(() => setRendering(draft));
    await nextFrame();

    const element = hostRef.current?.firstElementChild as HTMLElement | null | undefined;
    if (!element) return { ok: false, reason: 'render_failed' };

    let blob: Blob;
    let dimensions: { width: number; height: number };
    try {
      blob = await renderElementToPng(element, { widthMm: COLUMN_WIDTH_MM, dpi: SAVE_DPI });
      dimensions = await readPngDimensions(blob);
    } catch {
      return { ok: false, reason: 'render_failed' };
    } finally {
      setRendering(null);
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const hash = await sha256(bytes);
    const path = `${workspaceId}/${new Date().getFullYear()}/${uuidv7()}.png`;

    const { error: uploadError } = await createClient()
      .storage.from('assets')
      .upload(path, blob, { contentType: 'image/png', upsert: false });
    if (uploadError) return { ok: false, reason: 'render_failed' };

    return approveDraftQuestion({
      questionId: draft.id,
      render: { path, mime: 'image/png', bytes: bytes.byteLength, ...dimensions, sha256: hash },
    });
  }

  async function approveMany(ids: readonly string[]) {
    setNotice(null);
    let approved = 0;
    let failedReason: string | null = null;
    let failed = 0;

    for (const id of ids) {
      const draft = drafts.find((candidate) => candidate.id === id);
      if (!draft) continue;
      setBusy(id, true);
      const result = await approveOne(draft);
      setBusy(id, false);

      if (result.ok) {
        approved += 1;
        removeDrafts([id]);
      } else {
        failed += 1;
        failedReason ??= result.reason;
      }
    }

    if (failed > 0) {
      setNotice({
        tone: approved > 0 ? 'warn' : 'err',
        text: [
          approved > 0 ? t('tray.approvedCount', { count: approved }) : null,
          t('tray.failedCount', {
            count: failed,
            reason: aiErrorText(t, failedReason ?? 'unknown'),
          }),
        ]
          .filter(Boolean)
          .join(' '),
      });
    } else if (approved > 0) {
      setNotice({ tone: 'ok', text: t('tray.approvedCount', { count: approved }) });
    }
  }

  async function deleteMany(ids: readonly string[]) {
    setNotice(null);
    const result = await deleteDraftQuestions({ questionIds: ids });
    if (!result.ok) {
      setNotice({ tone: 'err', text: aiErrorText(t, result.reason) });
      return;
    }
    removeDrafts(ids);
    setNotice({ tone: 'ok', text: t('tray.deletedCount', { count: result.deleted }) });
  }

  async function runQualityCheck(draft: DraftQuestionRow) {
    setNotice(null);
    setBusy(draft.id, true);
    const result = await qualityCheck({ questionId: draft.id });
    setBusy(draft.id, false);

    if (!result.ok) {
      setNotice({ tone: 'err', text: aiErrorText(t, result.reason) });
      return;
    }
    setDrafts((current) =>
      current.map((row) => (row.id === draft.id ? { ...row, quality: result.check } : row)),
    );
  }

  async function saveEdit(draft: DraftQuestionRow, values: EditValues) {
    setNotice(null);
    setBusy(draft.id, true);
    const result = await updateDraftQuestion({
      questionId: draft.id,
      stem: values.stem,
      options: draft.questionType === 'mcq' ? values.options : [],
      correctOptionId: draft.questionType === 'mcq' ? values.correctOptionId : null,
      trueFalseValue: draft.questionType === 'tf' ? values.trueFalseValue : null,
      explanation: values.explanation,
    });
    setBusy(draft.id, false);

    if (!result.ok) {
      setNotice({ tone: 'err', text: aiErrorText(t, result.reason) });
      return;
    }

    setDrafts((current) =>
      current.map((row) =>
        row.id === draft.id
          ? {
              ...row,
              stem: values.stem,
              options:
                draft.questionType === 'mcq'
                  ? values.options.map((text, index) => ({
                      id: OPTION_LETTERS[index] as string,
                      text,
                    }))
                  : [],
              correctOptionId: draft.questionType === 'mcq' ? values.correctOptionId : null,
              trueFalseValue: draft.questionType === 'tf' ? values.trueFalseValue : null,
              explanation: values.explanation,
              quality: null,
            }
          : row,
      ),
    );
    setEditingId(null);
  }

  const allSelected = drafts.length > 0 && selected.size === drafts.length;
  const anyBusy = busyIds.size > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {drafts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3">
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) =>
                setSelected(checked === true ? new Set(drafts.map((d) => d.id)) : new Set())
              }
              aria-label={t('tray.selectAll')}
            />
            {selected.size > 0
              ? t('tray.selected', { count: selected.size })
              : t('tray.count', { count: drafts.length })}
          </label>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={anyBusy} onClick={() => void approveMany([...selected])}>
                {t('tray.approveSelected')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={anyBusy}
                onClick={() => void deleteMany([...selected])}
              >
                {t('tray.deleteSelected')}
              </Button>
            </div>
          )}
        </div>
      )}

      {notice && (
        <div className="px-6 pt-4">
          <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {drafts.length === 0 ? (
          <div className="px-6">
            <EmptyState message={t('tray.empty')} />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {drafts.map((draft) => {
              const busy = busyIds.has(draft.id);
              const editing = editingId === draft.id;
              const answered =
                draft.questionType === 'open' ||
                (draft.questionType === 'mcq'
                  ? draft.correctOptionId !== null
                  : draft.trueFalseValue !== null);

              return (
                <li
                  key={draft.id}
                  className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 px-6 py-5 sm:grid-cols-[auto_1fr_auto]"
                  aria-busy={busy || undefined}
                >
                  <Checkbox
                    checked={selected.has(draft.id)}
                    onCheckedChange={(checked) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (checked === true) next.add(draft.id);
                        else next.delete(draft.id);
                        return next;
                      })
                    }
                    aria-label={t('tray.selectRow')}
                    className="mt-1"
                  />

                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <EditForm
                        draft={draft}
                        busy={busy}
                        onCancel={() => setEditingId(null)}
                        onSave={(values) => void saveEdit(draft, values)}
                      />
                    ) : (
                      <DraftBody draft={draft} />
                    )}
                  </div>

                  {!editing && (
                    <div className="col-span-2 flex flex-row flex-wrap gap-2 sm:col-span-1 sm:shrink-0 sm:flex-col sm:items-stretch">
                      <Button
                        size="sm"
                        loading={busy && rendering?.id === draft.id}
                        disabled={busy || !answered}
                        onClick={() => void approveMany([draft.id])}
                      >
                        {busy && rendering?.id === draft.id
                          ? t('tray.approving')
                          : t('tray.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setEditingId(draft.id)}
                      >
                        {t('tray.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        disabled={busy}
                        onClick={() => void runQualityCheck(draft)}
                      >
                        {t('tray.checkQuality')} (
                        {t('actions.cost', { credits: creditCosts.qualityCheck })})
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        disabled={busy}
                        onClick={() => void deleteMany([draft.id])}
                      >
                        {t('tray.delete')}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div
        ref={hostRef}
        aria-hidden="true"
        style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
      >
        {rendering && (
          <QuestionPrintPreview
            stemRich={textToRichDoc(rendering.stem)}
            options={toEditableOptions(rendering)}
          />
        )}
      </div>
    </div>
  );
}

function DraftBody({ draft }: { readonly draft: DraftQuestionRow }) {
  const t = useTranslations('ai');
  const tBank = useTranslations('bank');
  const origin =
    draft.aiKind === 'image_to_text'
      ? t('tray.fromImage')
      : draft.aiKind === 'generate_distractors'
        ? t('tray.fromDistractors')
        : t('tray.fromGenerate');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warn">{t('tray.draftBadge')}</Badge>
        <Badge>{tBank(`filters.types.${draft.questionType}`)}</Badge>
        {draft.difficulty !== null && (
          <Badge>{t('tray.difficulty', { value: draft.difficulty })}</Badge>
        )}
        <span className="text-xs text-ink-3">{origin}</span>
      </div>

      <div className="text-sm text-ink">
        <Equation text={draft.stem} />
      </div>

      {draft.questionType === 'mcq' && (
        <ol className="flex flex-col gap-1.5 text-sm text-ink">
          {draft.options.map((option) => {
            const isCorrect = option.id === draft.correctOptionId;
            return (
              <li key={option.id} className="flex items-start gap-2">
                <span className="w-5 shrink-0 font-medium text-ink-2">{option.id})</span>
                <span className="min-w-0">
                  <Equation text={option.text} />
                </span>
                {isCorrect && (
                  <Badge tone="ok" className="mt-0.5 shrink-0">
                    {t('tray.correctMark')}
                  </Badge>
                )}
              </li>
            );
          })}
          {draft.correctOptionId === null && (
            <li>
              <Badge tone="err">{t('tray.noAnswer')}</Badge>
            </li>
          )}
        </ol>
      )}

      {draft.questionType === 'tf' && (
        <p className="text-sm text-ink">
          <span className="text-ink-2">{t('tray.answerLabel')}: </span>
          {draft.trueFalseValue === null ? (
            <Badge tone="err">{t('tray.noAnswer')}</Badge>
          ) : (
            <Badge tone="ok">
              {draft.trueFalseValue ? t('tray.trueLabel') : t('tray.falseLabel')}
            </Badge>
          )}
        </p>
      )}

      {draft.explanation && (
        <details className="text-sm text-ink-2">
          <summary className="cursor-pointer text-ink">
            {draft.questionType === 'open' ? t('tray.explanationOpen') : t('tray.explanation')}
          </summary>
          <div className="mt-1">
            <Equation text={draft.explanation} />
          </div>
        </details>
      )}

      {draft.flags.hasFigure && <InlineNotice tone="warn">{t('tray.figureWarning')}</InlineNotice>}
      {draft.flags.uncertain && (
        <InlineNotice tone="warn">{t('tray.uncertainWarning')}</InlineNotice>
      )}

      {draft.quality && (
        <div className="flex flex-col gap-1.5 text-sm">
          <h3 className="text-xs font-medium text-ink-2">{t('tray.qualityTitle')}</h3>
          {draft.quality.issues.length === 0 ? (
            <p className="text-ink-2">{t('tray.qualityClean')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {draft.quality.issues.map((issue, index) => (
                <li key={`${issue.kind}-${index}`} className="flex items-start gap-2">
                  <Badge
                    tone={
                      issue.severity === 'error'
                        ? 'err'
                        : issue.severity === 'warn'
                          ? 'warn'
                          : 'neutral'
                    }
                  >
                    {t(`qualityKinds.${issue.kind}`)}
                  </Badge>
                  <span className="text-ink">{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink-3">
            {t('tray.qualityDifficulty', { value: draft.quality.difficultyEstimate })}
          </p>
        </div>
      )}
    </div>
  );
}

function EditForm({
  draft,
  busy,
  onCancel,
  onSave,
}: {
  readonly draft: DraftQuestionRow;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onSave: (values: EditValues) => void;
}) {
  const t = useTranslations('ai');
  const [stem, setStem] = useState(draft.stem);
  const [options, setOptions] = useState(draft.options.map((option) => option.text));
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(draft.correctOptionId);
  const [trueFalseValue, setTrueFalseValue] = useState<boolean | null>(draft.trueFalseValue);
  const [explanation, setExplanation] = useState(draft.explanation);

  const valid =
    stem.trim().length > 0 &&
    (draft.questionType !== 'mcq' || options.every((option) => option.trim().length > 0));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          onSave({
            stem: stem.trim(),
            options: options.map((option) => option.trim()),
            correctOptionId,
            trueFalseValue,
            explanation: explanation.trim(),
          });
        }
      }}
    >
      <FormField label={t('tray.stemLabel')} hint={t('tray.stemHint')}>
        {(field) => (
          <Textarea {...field} value={stem} onChange={(event) => setStem(event.target.value)} />
        )}
      </FormField>

      {draft.questionType === 'mcq' && (
        <>
          <div className="flex flex-col gap-3">
            {options.map((option, index) => (
              <FormField
                key={OPTION_LETTERS[index]}
                label={t('tray.optionLabel', { letter: OPTION_LETTERS[index] ?? index + 1 })}
              >
                {(field) => (
                  <Input
                    {...field}
                    value={option}
                    onChange={(event) =>
                      setOptions((current) =>
                        current.map((value, i) => (i === index ? event.target.value : value)),
                      )
                    }
                  />
                )}
              </FormField>
            ))}
          </div>
          <FormField label={t('tray.correctOption')}>
            {(field) => (
              <Select
                {...(correctOptionId ? { value: correctOptionId } : {})}
                onValueChange={setCorrectOptionId}
              >
                <SelectTrigger id={field.id}>
                  <SelectValue placeholder={t('tray.noAnswer')} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((_, index) => (
                    <SelectItem key={OPTION_LETTERS[index]} value={OPTION_LETTERS[index] as string}>
                      {OPTION_LETTERS[index]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </>
      )}

      {draft.questionType === 'tf' && (
        <FormField label={t('tray.answerLabel')}>
          {(field) => (
            <Select
              {...(trueFalseValue === null ? {} : { value: trueFalseValue ? 'true' : 'false' })}
              onValueChange={(value) => setTrueFalseValue(value === 'true')}
            >
              <SelectTrigger id={field.id}>
                <SelectValue placeholder={t('tray.noAnswer')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t('tray.trueLabel')}</SelectItem>
                <SelectItem value="false">{t('tray.falseLabel')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
      )}

      <FormField
        label={draft.questionType === 'open' ? t('tray.explanationOpen') : t('tray.explanation')}
      >
        {(field) => (
          <Textarea
            {...field}
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
          />
        )}
      </FormField>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy} disabled={!valid}>
          {t('tray.save')}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          {t('tray.cancel')}
        </Button>
      </div>
    </form>
  );
}
