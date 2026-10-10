'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_QUESTIONS = 6;

type DemoQuestion =
  | { readonly id: number; readonly kind: 'image'; readonly url: string }
  | { readonly id: number; readonly kind: 'sample' };

/**
 * Landing-page demo, drawn as the editor: question strip, paper, inspector and
 * paste bar. Pasted or chosen images become object URLs and live only in this
 * tab: no upload, no fetch, no storage. Each new question settles into the
 * paper with a short slide, the signature motion (docs/03), which only ever
 * plays in response to the visitor's own action.
 */
export function PasteDemo() {
  const t = useTranslations('marketing.home.demo');
  const tm = useTranslations('marketing.home.demoMore');
  const [questions, setQuestions] = useState<DemoQuestion[]>([]);
  const [notice, setNotice] = useState<'idle' | 'unsupported'>('idle');
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const nextId = useRef(1);
  const urls = useRef<string[]>([]);

  const append = useCallback((make: (id: number) => DemoQuestion, count: number) => {
    setQuestions((current) => {
      const room = Math.max(0, MAX_QUESTIONS - current.length);
      const added = Array.from({ length: Math.min(room, count) }, () => make(nextId.current++));
      if (added.length > 0) {
        setLastAdded(current.length + added.length);
      }
      return [...current, ...added];
    });
    setNotice('idle');
  }, []);

  const addFiles = useCallback(
    (files: readonly File[]) => {
      const images = files.filter((file) => ACCEPTED_MIME.includes(file.type));

      if (images.length === 0) {
        setNotice('unsupported');
        return;
      }

      let index = 0;
      append((id) => {
        const file = images[index++] as File;
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        return { id, kind: 'image', url };
      }, images.length);
    },
    [append],
  );

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) {
        return;
      }
      event.preventDefault();
      addFiles(files);
    }

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [addFiles]);

  useEffect(() => {
    const created = urls.current;
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function remove(id: number) {
    setQuestions((current) => current.filter((question) => question.id !== id));
    setLastAdded(null);
    setNotice('idle');
  }

  const isFull = questions.length >= MAX_QUESTIONS;

  let status = t('empty');
  if (notice === 'unsupported') {
    status = t('unsupported');
  } else if (isFull) {
    status = t('full', { max: MAX_QUESTIONS });
  } else if (lastAdded !== null) {
    status = tm('added', { number: lastAdded });
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="sheet overflow-hidden rounded-dialog bg-surface text-base text-ink shadow-sheet"
        data-testid="paste-demo"
        role="group"
        aria-label={tm('frameLabel')}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <p className="font-medium">{t('paperTitle')}</p>
          <div className="flex items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-control border border-line-strong px-3 text-sm font-medium focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent hover:bg-canvas">
              {t('choose')}
              <input
                type="file"
                accept={ACCEPTED_MIME.join(',')}
                multiple
                className="sr-only"
                data-testid="paste-demo-input"
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []));
                  event.target.value = '';
                }}
              />
            </label>
            <span className="hidden h-9 items-center rounded-control bg-accent px-3 text-sm font-medium text-surface sm:inline-flex">
              {tm('export')}
            </span>
          </div>
        </div>

        <div className="flex min-h-[420px] bg-canvas">
          <aside
            className="hidden w-40 shrink-0 flex-col gap-2.5 border-r border-line bg-surface p-3 md:flex"
            aria-label={tm('strip')}
          >
            <p className="text-sm text-ink-2">{tm('strip')}</p>
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="demo-settle flex flex-col gap-1.5 rounded-thumb border border-line p-2"
              >
                <span className="text-xs text-ink-2">
                  {tm('questionLabel', { number: index + 1 })}
                </span>
                <span className="h-1 rounded-[1px] bg-sketch" />
                <span className="h-1 w-2/3 rounded-[1px] bg-sketch" />
              </div>
            ))}
          </aside>

          <div className="flex min-w-0 flex-1 justify-center px-3 py-6 sm:px-6">
            <div className="w-full max-w-xl rounded-paper bg-surface p-5 shadow-page sm:p-7">
              <div className="flex items-end justify-between gap-3 border-b-[1.5px] border-ink pb-2.5">
                <div>
                  <p className="font-semibold">{t('paperTitle')}</p>
                  <p className="mt-0.5 text-xs text-ink-2">{tm('studentLine')}</p>
                </div>
                <span className="rounded-paper border border-ink px-2 py-0.5 text-xs">
                  {tm('booklet')}
                </span>
              </div>

              {questions.length === 0 ? (
                <p className="mt-5 text-sm text-ink-2">{t('empty')}</p>
              ) : (
                <ol className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {questions.map((question, index) => (
                    <li key={question.id} className="demo-settle flex min-w-0 flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold tabular-nums">{index + 1}.</span>
                        {question.kind === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local object URL, never optimizable
                          <img
                            src={question.url}
                            alt={t('questionAlt', { number: index + 1 })}
                            className="max-w-full min-w-0"
                          />
                        ) : (
                          <SampleQuestion label={tm('sampleAlt', { number: index + 1 })} />
                        )}
                      </div>
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="self-start"
                        onClick={() => remove(question.id)}
                      >
                        {t('remove')}
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <aside className="hidden w-56 shrink-0 flex-col gap-3.5 border-l border-line bg-surface p-4 text-sm lg:flex">
            <div className="flex gap-3.5 border-b border-line pb-2">
              <span className="font-semibold text-accent">{tm('tabPage')}</span>
              <span className="text-ink-2">{tm('tabBooklets')}</span>
              <span className="text-ink-2">{tm('tabAnswers')}</span>
            </div>
            <InspectorRow label={tm('pageSize')} value={tm('pageSizeValue')} />
            <InspectorRow label={tm('columns')} value="2" />
            <InspectorRow label={tm('gap')} value={tm('gapValue')} />
            <InspectorRow label={tm('booklets')} value="A, B" />
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-sm">
          <p
            aria-live="polite"
            className={notice === 'unsupported' ? 'text-err' : isFull ? 'text-warn' : 'text-ink'}
          >
            {status}
            {questions.length > 0 && (
              <span className="ml-2 text-ink-2">{tm('count', { count: questions.length })}</span>
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={isFull}
            onClick={() => append((id) => ({ id, kind: 'sample' }), 1)}
          >
            {tm('sample')}
          </Button>
        </div>
      </div>
      <p className="text-sm text-on-brand-3">{t('privacy')}</p>
    </div>
  );
}

function InspectorRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-2">{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** A drawn stand-in for a question, so the motion can be tried without an image. */
function SampleQuestion({ label }: { readonly label: string }) {
  return (
    <div role="img" aria-label={label} className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1.5">
      <span className="h-1.5 bg-sketch" />
      <span className="h-1.5 w-3/5 bg-sketch" />
      <span className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
        <span className="h-1 bg-line" />
        <span className="h-1 bg-line" />
        <span className="h-1 bg-line" />
        <span className="h-1 bg-line" />
      </span>
    </div>
  );
}
