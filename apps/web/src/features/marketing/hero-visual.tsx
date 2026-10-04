import { Check } from '@phosphor-icons/react/dist/ssr';
import { getTranslations } from 'next-intl/server';

import { Kbd } from '@/components/ui/kbd';

type Figure = 'bars' | 'cells' | null;

interface MockQuestion {
  readonly lines: readonly string[];
  readonly figure: Figure;
}

const COLUMNS: readonly (readonly MockQuestion[])[] = [
  [
    { lines: ['w-full', 'w-5/6'], figure: 'bars' },
    { lines: ['w-full', 'w-2/3'], figure: null },
    { lines: ['w-11/12', 'w-3/4'], figure: 'cells' },
  ],
  [
    { lines: ['w-full', 'w-3/4'], figure: 'cells' },
    { lines: ['w-5/6', 'w-full'], figure: null },
    { lines: ['w-full', 'w-1/2'], figure: 'bars' },
  ],
];

const BAR_HEIGHTS = ['h-3', 'h-5', 'h-4', 'h-6'] as const;
const CHOICES = ['A', 'B', 'C', 'D'] as const;

function MockFigure({ figure }: { figure: Exclude<Figure, null> }) {
  if (figure === 'bars') {
    return (
      <div className="mt-1.5 flex h-8 items-end gap-1 rounded-thumb bg-accent-tint px-2 pb-1">
        {BAR_HEIGHTS.map((height, index) => (
          <span key={index} className={`${height} w-3 rounded-thumb bg-accent/70`} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-1.5 grid grid-cols-3 gap-px overflow-hidden rounded-thumb bg-line-strong">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className="h-3 bg-ok-tint" />
      ))}
    </div>
  );
}

/**
 * Decorative paper that fills itself question by question, looping. It mirrors
 * what the product does (paste, then a laid out A4 sheet) without any real
 * content, so it is hidden from assistive technology.
 */
export async function HeroVisual() {
  const t = await getTranslations('marketing.home.hero');
  let slot = 0;

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md px-4 py-8 lg:max-w-none">
      <div className="absolute inset-x-10 inset-y-4 rotate-3 rounded-paper border border-line bg-canvas" />
      <div className="absolute inset-x-8 inset-y-6 -rotate-1 rounded-paper border border-line bg-accent-tint" />

      <div className="hero-float relative">
        <div className="hero-paper relative rounded-paper border border-line-strong bg-surface p-4 shadow-float">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-line-strong pb-3">
            <div className="flex flex-col gap-1.5">
              <span className="h-2 w-28 rounded-thumb bg-ink" />
              <span className="text-xs text-ink-3">{t('school')}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="h-1.5 w-16 rounded-thumb bg-line-strong" />
              <span className="h-1.5 w-12 rounded-thumb bg-line-strong" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            {COLUMNS.map((column, columnIndex) => (
              <ol
                key={columnIndex}
                className={columnIndex === 0 ? 'border-r border-line pr-4' : undefined}
              >
                {column.map((question, questionIndex) => {
                  const currentSlot = slot;
                  slot += 1;

                  return (
                    <li
                      key={questionIndex}
                      className="hero-pop mb-3 flex gap-2 border-b border-line pb-3 last:mb-0 last:border-b-0 last:pb-0"
                      style={{ ['--hero-slot' as string]: currentSlot }}
                    >
                      <span className="text-xs font-medium text-ink tabular-nums">
                        {columnIndex * 3 + questionIndex + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1.5">
                          {question.lines.map((width, lineIndex) => (
                            <span
                              key={lineIndex}
                              className={`h-1.5 ${width} rounded-thumb bg-line-strong`}
                            />
                          ))}
                        </div>
                        {question.figure ? <MockFigure figure={question.figure} /> : null}
                        <div className="mt-2 flex gap-1">
                          {CHOICES.map((choice) => (
                            <span
                              key={choice}
                              className="flex size-4 items-center justify-center rounded-thumb border border-line-strong text-xs text-ink-2"
                            >
                              {choice}
                            </span>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ))}
          </div>
        </div>
      </div>

      <div className="hero-float-alt absolute top-1 left-0 z-10">
        <div className="hero-key flex items-center gap-1.5 rounded-control border border-b-4 border-line-strong bg-surface px-2.5 py-1.5 text-sm font-medium text-ink shadow-float">
          <Kbd>Ctrl</Kbd>
          <span className="text-ink-3">+</span>
          <Kbd>V</Kbd>
          <span className="pl-1 text-ink-2">{t('paste')}</span>
        </div>
      </div>

      <div className="hero-float absolute right-0 bottom-2 z-10">
        <div className="flex items-center gap-2.5 rounded-control border border-ok/30 bg-ok-tint px-3 py-2 shadow-float">
          <span className="flex size-6 items-center justify-center rounded-thumb bg-ok text-surface">
            <Check size={14} weight="bold" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-ok">{t('ready')}</span>
            <span className="text-xs text-ink-2">{t('pages')}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
