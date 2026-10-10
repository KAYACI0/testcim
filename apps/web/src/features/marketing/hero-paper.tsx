'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { useInView } from './motion';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

const ANSWERS = [2, 0, 3, 1] as const;
const LETTERS = ['A', 'B', 'C', 'D'] as const;
const QUESTIONS = ANSWERS.length;
/** Steps: 1..4 questions land, 5..8 answers fill, 9 the PDF tag, then hold and restart. */
const LAST_STEP = QUESTIONS * 2 + 1;

function delayFor(step: number): number {
  if (step === 0) return 700;
  if (step < QUESTIONS) return 900;
  if (step === QUESTIONS) return 700;
  if (step < LAST_STEP - 1) return 380;
  if (step === LAST_STEP - 1) return 600;
  return 3200;
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Hero illustration: a test sheet filling itself. It is not the application UI, only
 * the paper the product prints. Plays while on screen; reduced motion shows the end state.
 */
export function HeroPaper() {
  const t = useTranslations('marketing.home');
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, rootMargin: '0px' });
  const [step, setStep] = useState(0);
  const [pressed, setPressed] = useState<'paste' | 'answer' | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !inView) {
      return;
    }
    const timer = window.setTimeout(() => {
      const next = step >= LAST_STEP ? 0 : step + 1;
      setStep(next);
      if (next >= 1 && next <= QUESTIONS) {
        setPressed('paste');
      } else if (next > QUESTIONS && next < LAST_STEP) {
        setPressed('answer');
      }
    }, delayFor(step));
    return () => window.clearTimeout(timer);
  }, [step, inView, reduced]);

  useEffect(() => {
    if (!pressed) return;
    const timer = window.setTimeout(() => setPressed(null), 160);
    return () => window.clearTimeout(timer);
  }, [pressed, step]);

  // Reduced motion shows the finished sheet and never plays the sequence.
  const current = reduced ? LAST_STEP : step;
  const shown = Math.min(current, QUESTIONS);
  const marked = Math.max(0, Math.min(current - QUESTIONS, QUESTIONS));

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[1/1.08] w-full max-w-[540px]"
      aria-hidden="true"
    >
      <div className="sheet-left absolute top-[7%] left-[16%] aspect-[0.707] w-[68%] rounded-paper border border-line bg-surface shadow-page">
        <span className="absolute top-3 left-4 text-xs font-semibold text-ink-3">B</span>
      </div>
      <div className="sheet-right absolute top-[7%] left-[16%] aspect-[0.707] w-[68%] rounded-paper border border-line bg-surface shadow-page">
        <span className="absolute top-3 right-4 text-xs font-semibold text-ink-3">C</span>
      </div>

      <div className="absolute top-[7%] left-[16%] flex aspect-[0.707] w-[68%] flex-col rounded-paper border border-line bg-surface p-[6%] shadow-lift">
        <div className="flex items-end justify-between gap-2 border-b-[1.5px] border-ink pb-2">
          <div className="min-w-0">
            <p className="truncate text-[clamp(10px,1.3vw,14px)] font-semibold">
              {t('demo.paperTitle')}
            </p>
            <p className="truncate text-[clamp(8px,0.9vw,11px)] text-ink-2">
              {t('demoMore.studentLine')}
            </p>
          </div>
          <span className="shrink-0 rounded-paper border border-ink px-1.5 py-0.5 text-[clamp(8px,0.9vw,11px)]">
            {t('demoMore.booklet')}
          </span>
        </div>

        <ol className="mt-[8%] grid flex-1 grid-cols-2 content-start gap-x-[8%] gap-y-[10%]">
          {ANSWERS.map((answer, index) => (
            <li
              key={index}
              className="hero-q flex flex-col gap-[6px] rounded-[2px] p-1"
              data-on={index < shown ? '' : undefined}
              data-fresh={index === shown - 1 && current <= QUESTIONS ? '' : undefined}
            >
              <span className="flex items-baseline gap-1.5">
                <span className="text-[clamp(9px,1vw,12px)] font-semibold tabular-nums">
                  {index + 1}.
                </span>
                <span className="h-[5px] flex-1 bg-sketch" />
              </span>
              <span className="ml-4 h-[5px] bg-sketch" />
              <span className="ml-4 h-[5px] w-3/5 bg-sketch" />
              {index % 2 === 1 && (
                <span className="mt-0.5 ml-4 block h-[clamp(20px,3vw,34px)] w-1/2 rounded-[2px] border border-line-strong" />
              )}
              <span className="mt-1 ml-4 flex gap-[clamp(4px,0.6vw,8px)]">
                {LETTERS.map((letter, letterIndex) => (
                  <span
                    key={letter}
                    className="relative flex h-[clamp(13px,1.5vw,18px)] w-[clamp(13px,1.5vw,18px)] items-center justify-center rounded-[50%] border border-line-strong text-[clamp(7px,0.75vw,9px)] text-ink-2"
                  >
                    {letter}
                    {letterIndex === answer && (
                      <span
                        className="hero-mark absolute inset-[-1px] flex items-center justify-center rounded-[50%] bg-accent text-surface"
                        data-on={index < marked ? '' : undefined}
                      >
                        {letter}
                      </span>
                    )}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <kbd
        className={cn(
          'key-press absolute top-[16%] left-0 rounded-control border border-line-strong bg-surface px-3 py-1.5 font-sans text-sm font-semibold text-accent-hover shadow-key',
        )}
        data-on={pressed === 'paste' ? '' : undefined}
      >
        {t('flow.paste.key')}
      </kbd>
      <kbd
        className="key-press absolute bottom-[30%] left-[2%] rounded-control border border-line-strong bg-surface px-3 py-1.5 font-sans text-sm font-semibold text-accent-hover shadow-key"
        data-on={pressed === 'answer' ? '' : undefined}
      >
        {t('flow.answer.key')}
      </kbd>

      <div
        className="hero-tag absolute right-0 bottom-[14%] flex items-center gap-2.5 rounded-panel border border-line bg-surface px-4 py-3 shadow-float"
        data-on={current >= LAST_STEP ? '' : undefined}
      >
        <span className="text-ok">
          <Icon name="check-circle" size={22} />
        </span>
        <span className="text-base font-medium text-ink">{t('heroPaper.ready')}</span>
      </div>
    </div>
  );
}
