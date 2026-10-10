'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ui/icon';

const STEPS = ['paste', 'answer', 'export'] as const;
const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function SketchQuestion({ number }: { readonly number: number }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs font-semibold tabular-nums">{number}.</span>
        <span className="h-1.5 flex-1 bg-sketch" />
      </span>
      <span className="ml-4 h-1.5 bg-sketch" />
      <span className="ml-4 h-1.5 w-2/3 bg-sketch" />
    </span>
  );
}

function Sheet({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="aspect-[0.707] h-[82%] rounded-paper border border-line bg-surface p-[5%] shadow-lift">
      {children}
    </div>
  );
}

/**
 * Scroll story for the three-key flow. The visual sticks while the steps scroll past;
 * the step nearest the middle of the viewport is the active one.
 */
export function FlowStory() {
  const t = useTranslations('marketing.home.flow');
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = stepRefs.current.indexOf(entry.target as HTMLLIElement);
            if (index >= 0) {
              setActive(index);
            }
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    stepRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-12 grid gap-x-16 lg:mt-16 lg:grid-cols-2">
      <div className="sticky top-16 z-10 -mx-4 bg-surface px-4 py-4 sm:-mx-6 sm:px-6 lg:top-28 lg:mx-0 lg:h-[min(560px,calc(100vh-160px))] lg:self-start lg:bg-transparent lg:p-0">
        <div
          className="relative mx-auto h-64 overflow-hidden rounded-dialog border border-line bg-canvas sm:h-80 lg:h-full"
          aria-hidden="true"
        >
          <div
            className="flow-layer absolute inset-0 flex items-center justify-center"
            data-on={active === 0 ? '' : undefined}
          >
            <Sheet>
              <span className="flex flex-col gap-2 sm:gap-4">
                <SketchQuestion number={1} />
                <SketchQuestion number={2} />
                <SketchQuestion number={3} />
                <span className="flow-drop rounded-[2px] ring-[1.5px] ring-accent">
                  <SketchQuestion number={4} />
                </span>
              </span>
            </Sheet>
            <span className="absolute top-[5%] left-[4%] rounded-control border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold text-accent-hover shadow-key">
              {t('paste.key')}
            </span>
            <span className="absolute right-[6%] bottom-[10%] rounded-panel border border-line bg-surface px-3 py-2 text-sm shadow-float">
              {t('visual.pasted')}
            </span>
          </div>

          <div
            className="flow-layer absolute inset-0 flex items-center justify-center"
            data-on={active === 1 ? '' : undefined}
          >
            <Sheet>
              <span className="flex flex-col gap-2 sm:gap-4">
                <SketchQuestion number={4} />
                <span className="ml-4 flex gap-2">
                  {LETTERS.map((letter) => (
                    <span
                      key={letter}
                      className={`flex h-6 w-6 items-center justify-center rounded-[50%] border text-[10px] ${letter === 'C' ? 'border-accent bg-accent text-surface' : 'border-line-strong text-ink-2'}`}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
                <SketchQuestion number={5} />
              </span>
            </Sheet>
            <span className="absolute top-[5%] left-[4%] flex gap-1">
              {LETTERS.map((letter) => (
                <span
                  key={letter}
                  className={`rounded-control border px-2.5 py-1 text-sm font-semibold shadow-key ${letter === 'C' ? 'translate-y-0.5 border-accent bg-accent text-surface' : 'border-line-strong bg-surface text-accent-hover'}`}
                >
                  {letter}
                </span>
              ))}
            </span>
            <span className="absolute right-[6%] bottom-[10%] rounded-panel border border-line bg-surface px-3 py-2 text-sm shadow-float">
              {t('visual.answer')}
            </span>
          </div>

          <div
            className="flow-layer absolute inset-0 flex items-center justify-center"
            data-on={active === 2 ? '' : undefined}
          >
            <div className="flow-fan relative flex h-full w-full items-center justify-center">
              {[0, 1, 2].map((page) => (
                <div
                  key={page}
                  className={`aspect-[0.707] h-[64%] rounded-paper border border-line bg-surface p-[4%] shadow-lift ${page === 1 ? 'relative z-10' : 'absolute'}`}
                >
                  <span className="flex flex-col gap-3">
                    <SketchQuestion number={page * 2 + 1} />
                    <SketchQuestion number={page * 2 + 2} />
                  </span>
                </div>
              ))}
            </div>
            <span className="absolute top-[5%] left-[4%] rounded-control border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold text-accent-hover shadow-key">
              {t('export.key')}
            </span>
            <span className="absolute right-[6%] bottom-[10%] z-20 flex items-center gap-2 rounded-panel border border-line bg-surface px-3 py-2 text-sm shadow-float">
              <span className="text-ok">
                <Icon name="check-circle" size={18} />
              </span>
              {t('visual.pdf')}
            </span>
          </div>
        </div>
      </div>

      <ol className="flex flex-col">
        {STEPS.map((step, index) => (
          <li
            key={step}
            ref={(node) => {
              stepRefs.current[index] = node;
            }}
            className="flow-step flex min-h-[46vh] flex-col justify-center gap-4 border-b border-line py-12 last:border-0 lg:min-h-[72vh]"
            data-on={active === index ? '' : undefined}
          >
            <kbd className="self-start rounded-control border border-line-strong bg-surface px-3 py-1.5 font-sans text-base font-semibold text-accent-hover shadow-key">
              {t(`${step}.key`)}
            </kbd>
            <h3 className="font-display text-[clamp(26px,3vw,36px)] leading-tight font-semibold tracking-[-0.01em]">
              {t(`${step}.title`)}
            </h3>
            <p className="max-w-md text-lg text-ink-2">{t(`${step}.body`)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
