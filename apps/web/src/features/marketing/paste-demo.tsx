'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_QUESTIONS = 6;

interface DemoQuestion {
  readonly id: number;
  readonly url: string;
}

/**
 * Landing-page demo. Pasted or chosen images become object URLs and live only
 * in this tab: no upload, no fetch, no storage. Each new question settles
 * into the paper with a short slide, the signature motion (docs/03), which
 * only ever plays in response to the visitor's own paste.
 */
export function PasteDemo() {
  const t = useTranslations('marketing.home.demo');
  const [questions, setQuestions] = useState<DemoQuestion[]>([]);
  const [notice, setNotice] = useState<'idle' | 'full' | 'unsupported'>('idle');
  const nextId = useRef(1);
  const urls = useRef<string[]>([]);

  const addFiles = useCallback((files: readonly File[]) => {
    const images = files.filter((file) => ACCEPTED_MIME.includes(file.type));

    if (images.length === 0) {
      setNotice('unsupported');
      return;
    }

    setQuestions((current) => {
      const room = Math.max(0, MAX_QUESTIONS - current.length);
      const added = images.slice(0, room).map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        return { id: nextId.current++, url };
      });
      return [...current, ...added];
    });
    setNotice('idle');
  }, []);

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
    setNotice('idle');
  }

  const isFull = questions.length >= MAX_QUESTIONS;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-col gap-3 rounded-paper border border-dashed border-line-strong bg-surface p-4"
        data-testid="paste-demo"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">{t('prompt')}</p>
          <label className="inline-flex h-10 cursor-pointer items-center rounded-control border border-line-strong px-3 text-sm font-medium text-ink focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent hover:bg-canvas">
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
        </div>

        <div className="rounded-paper bg-canvas p-4 sm:p-6">
          <div
            className="mx-auto flex min-h-[220px] max-w-xl flex-col gap-4 rounded-paper bg-surface p-5 shadow-[0_1px_3px_rgb(20_28_45_/_0.12)]"
            aria-live="polite"
          >
            <p className="border-b border-line pb-3 text-sm font-medium text-ink">
              {t('paperTitle')}
            </p>
            {questions.length === 0 ? (
              <p className="text-sm text-ink-2">{t('empty')}</p>
            ) : (
              <ol className="flex flex-col gap-4">
                {questions.map((question, index) => (
                  <li
                    key={question.id}
                    className="demo-settle flex items-start gap-3 border-b border-line pb-4 last:border-0"
                  >
                    <span className="mt-1 text-sm text-ink-2 tabular-nums">{index + 1}.</span>
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, never optimizable */}
                    <img
                      src={question.url}
                      alt={t('questionAlt', { number: index + 1 })}
                      className="max-w-full min-w-0"
                    />
                    <Button
                      variant="tertiary"
                      size="sm"
                      className="ml-auto shrink-0"
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

        {isFull && <p className="text-sm text-warn">{t('full', { max: MAX_QUESTIONS })}</p>}
        {notice === 'unsupported' && <p className="text-sm text-err">{t('unsupported')}</p>}
      </div>
      <p className="text-sm text-ink-2">{t('privacy')}</p>
      <p className="text-sm text-ink">
        <Link href="/login" className="font-medium text-accent hover:underline">
          {t('signup')}
        </Link>
      </p>
    </div>
  );
}
