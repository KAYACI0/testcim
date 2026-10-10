import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { FaqAccordion } from './faq-accordion';
import { FEATURE_KEYS } from './feature-keys';
import { FlowStory } from './flow-story';
import { HeroPaper } from './hero-paper';
import { Reveal } from './motion';
import { PasteDemo } from './paste-demo';

import type { CSSProperties, ReactNode } from 'react';

import { Icon, type IconName } from '@/components/ui/icon';

const SECTION = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
const HEADING =
  'font-display text-[clamp(32px,4.4vw,52px)] leading-[1.1] font-semibold tracking-[-0.015em]';

/** Features listed under the showcases; crop, booklets and omr have their own rows. */
const LISTED_FEATURES = FEATURE_KEYS.filter(
  (key) => key !== 'crop' && key !== 'booklets' && key !== 'omr',
);

function delay(ms: number, name: '--word-delay' | '--fade-delay'): CSSProperties {
  return { [name]: `${String(ms)}ms` };
}

export async function HeroSection() {
  const t = await getTranslations('marketing.home');
  const words = t('title').split(' ');

  return (
    <section
      className={`${SECTION} grid items-center gap-12 pt-14 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28`}
    >
      <div>
        <h1 className="font-display text-[clamp(42px,6.2vw,80px)] leading-[1.04] font-semibold tracking-[-0.025em] text-ink">
          {words.map((word, index) => (
            <span key={index}>
              <span className="word-rise" style={delay(80 + index * 70, '--word-delay')}>
                {word}
              </span>
              {index < words.length - 1 ? ' ' : null}
            </span>
          ))}
        </h1>
        <p
          className="fade-up mt-6 max-w-xl text-[clamp(18px,1.8vw,21px)] text-ink-2"
          style={delay(520, '--fade-delay')}
        >
          {t('lead')}
        </p>
        <div
          className="fade-up mt-9 flex flex-wrap items-center gap-3"
          style={delay(640, '--fade-delay')}
        >
          <Link
            href="/login"
            className="inline-flex h-13 items-center rounded-control bg-accent px-6 text-lg font-semibold text-surface transition-colors hover:bg-accent-hover"
          >
            {t('primaryAction')}
          </Link>
          <a
            href="#nasil"
            className="inline-flex h-13 items-center rounded-control border border-line-strong px-6 text-lg font-medium text-ink transition-colors hover:bg-canvas"
          >
            {t('secondaryAction')}
          </a>
        </div>
        <p className="fade-up mt-5 text-sm text-ink-3" style={delay(760, '--fade-delay')}>
          {t('heroNote')}
        </p>
      </div>
      <div className="fade-up" style={delay(300, '--fade-delay')}>
        <HeroPaper />
      </div>
    </section>
  );
}

export async function MarqueeSection() {
  const t = await getTranslations('marketing.home.marquee');
  const items = t.raw('items') as string[];
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item} className="flex items-center whitespace-nowrap">
          <span className="px-8 text-lg text-ink-2">{item}</span>
          <span className="h-5 w-px bg-line-strong" />
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label={t('label')} className="marquee overflow-hidden border-y border-line py-5">
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}

export async function FlowSection() {
  const t = await getTranslations('marketing.home.flow');

  return (
    <section id="nasil" aria-labelledby="flow-heading" className={`${SECTION} scroll-mt-16 pt-28`}>
      <Reveal className="max-w-2xl">
        <h2 id="flow-heading" className={HEADING}>
          {t('title')}
        </h2>
        <p className="mt-4 text-xl text-ink-2">{t('lead')}</p>
      </Reveal>
      <FlowStory />
    </section>
  );
}

export async function TrySection() {
  const t = await getTranslations('marketing.home');

  return (
    <section id="demo" aria-labelledby="try-heading" className="mt-20 scroll-mt-16 bg-canvas py-24">
      <div className={SECTION}>
        <Reveal className="max-w-2xl">
          <h2 id="try-heading" className={HEADING}>
            {t('tryTitle')}
          </h2>
          <p className="mt-4 text-xl text-ink-2">{t('tryLead')}</p>
        </Reveal>
        <Reveal delay={120} className="mt-10">
          <PasteDemo />
        </Reveal>
      </div>
    </section>
  );
}

function Showcase({
  title,
  body,
  visual,
  reverse = false,
}: {
  readonly title: string;
  readonly body: string;
  readonly visual: ReactNode;
  readonly reverse?: boolean;
}) {
  return (
    <Reveal
      className={`mt-24 flex items-center gap-x-16 gap-y-10 first:mt-16 ${reverse ? 'flex-row-reverse flex-wrap-reverse' : 'flex-wrap'}`}
    >
      <div className="max-w-md flex-[1_1_340px]">
        <h3 className="font-display text-[clamp(26px,2.8vw,34px)] leading-tight font-semibold tracking-[-0.01em]">
          {title}
        </h3>
        <p className="mt-4 text-lg text-ink-2">{body}</p>
      </div>
      <div
        className="flex min-h-72 flex-[1_1_480px] items-center rounded-dialog border border-line bg-canvas p-6 sm:p-8"
        aria-hidden="true"
      >
        <div className="w-full rounded-panel border border-line bg-surface p-6 shadow-page">
          {visual}
        </div>
      </div>
    </Reveal>
  );
}

function Lines({ widths }: { readonly widths: string[] }) {
  return (
    <>
      {widths.map((width, index) => (
        <span key={index} className={`block h-1.5 bg-sketch ${width}`} />
      ))}
    </>
  );
}

const BOOKLET_POSE = [
  'translateX(-62%) rotate(-6deg)',
  'translateY(-6px)',
  'translateX(62%) rotate(6deg)',
] as const;

export async function FeaturesSection() {
  const t = await getTranslations('marketing.home');
  const ts = await getTranslations('marketing.home.showcase');
  const tf = await getTranslations('marketing.featureItems');
  const cropItems = [
    { number: 14, status: ts('crop.added'), tone: 'text-ok' },
    { number: 15, status: ts('crop.selected'), tone: 'text-accent' },
    { number: 16, status: ts('crop.waiting'), tone: 'text-ink-3' },
  ];
  const omrRows = [
    { answer: 2, score: 17 },
    { answer: 0, score: 14 },
    { answer: 3, score: null },
  ];

  return (
    <section
      id="ozellikler"
      aria-labelledby="features-heading"
      className={`${SECTION} scroll-mt-16 pt-28`}
    >
      <Reveal className="max-w-2xl">
        <h2 id="features-heading" className={HEADING}>
          {t('featuresTitle')}
        </h2>
      </Reveal>

      <Showcase
        title={ts('crop.title')}
        body={tf('crop.detail')}
        visual={
          <div className="flex items-start gap-5">
            <div className="relative flex flex-1 flex-col gap-4 rounded-paper bg-canvas p-4">
              <div className="flex flex-col gap-1.5 p-2">
                <Lines widths={['w-full', 'w-3/4', 'w-1/2']} />
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                <Lines widths={['w-full', 'w-2/3']} />
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                <Lines widths={['w-full', 'w-4/5']} />
              </div>
              <span className="crop-box absolute top-3 right-3 left-3 h-[36%] rounded-paper border-[1.5px] border-accent bg-accent-tint/60" />
            </div>
            <div className="hidden w-40 shrink-0 flex-col text-sm sm:flex">
              <span className="pb-1.5 text-ink-2">{ts('crop.listTitle')}</span>
              {cropItems.map((item, index) => (
                <span
                  key={item.number}
                  className="stagger-item flex justify-between border-b border-line py-2 last:border-0"
                  style={{ '--i': index } as CSSProperties}
                >
                  {ts('crop.item', { number: item.number })}
                  <span className={item.tone}>{item.status}</span>
                </span>
              ))}
            </div>
          </div>
        }
      />

      <Showcase
        reverse
        title={ts('booklets.title')}
        body={tf('booklets.detail')}
        visual={
          <div className="relative flex h-56 items-center justify-center">
            {(['A', 'B', 'C'] as const).map((letter, index) => (
              <div
                key={letter}
                className={`booklet absolute flex aspect-[0.707] h-48 flex-col gap-1.5 rounded-paper border bg-surface p-3 text-xs shadow-page ${index === 1 ? 'z-10 border-accent' : 'border-line-strong'}`}
                style={{ transform: BOOKLET_POSE[index] }}
              >
                <span className={`font-semibold ${index === 1 ? 'text-accent' : 'text-ink'}`}>
                  {letter}
                </span>
                <Lines
                  widths={
                    index === 1
                      ? ['w-3/5', 'w-full', 'w-full', 'w-2/3']
                      : ['w-full', 'w-full', 'w-3/5', 'w-4/5']
                  }
                />
              </div>
            ))}
          </div>
        }
      />

      <Showcase
        title={ts('omr.title')}
        body={tf('omr.detail')}
        visual={
          <div className="text-sm">
            <div className="flex justify-between border-b border-line pb-2.5 text-ink-2">
              <span>{ts('omr.student')}</span>
              <span>{ts('omr.correct')}</span>
            </div>
            {omrRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0"
              >
                <span className="w-24 shrink-0">{ts('omr.row', { number: rowIndex + 1 })}</span>
                <span className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((option) => (
                    <span
                      key={option}
                      className="flex h-4 w-4 items-center justify-center rounded-[50%] border border-line-strong"
                    >
                      {option === row.answer && (
                        <span
                          className="omr-dot h-2.5 w-2.5 rounded-[50%] bg-ink"
                          style={{ '--i': rowIndex } as CSSProperties}
                        />
                      )}
                    </span>
                  ))}
                </span>
                <span
                  className="stagger-item min-w-16 text-right tabular-nums"
                  style={{ '--i': rowIndex } as CSSProperties}
                >
                  {row.score === null ? (
                    <span className="text-warn">{ts('omr.review')}</span>
                  ) : (
                    ts('omr.score', { score: row.score, total: 20 })
                  )}
                </span>
              </div>
            ))}
          </div>
        }
      />

      <Reveal as="ul" className="mt-28 border-t border-line">
        {LISTED_FEATURES.map((key) => (
          <li key={key} className="flex flex-wrap gap-x-12 gap-y-2 border-b border-line py-6">
            <h3 className="flex-[0_1_300px] text-xl font-semibold">{tf(`${key}.title`)}</h3>
            <p className="flex-[1_1_420px] text-lg text-ink-2">{tf(`${key}.summary`)}</p>
          </li>
        ))}
      </Reveal>
      <p className="mt-6">
        <Link href="/features" className="text-lg font-medium text-accent hover:underline">
          {t('featuresMore')}
        </Link>
      </p>
    </section>
  );
}

export async function TrustSection() {
  const t = await getTranslations('marketing.home.trust');
  const items: { key: 'draft' | 'workspace' | 'payment' | 'print'; icon: IconName }[] = [
    { key: 'draft', icon: 'pencil-simple' },
    { key: 'workspace', icon: 'folder' },
    { key: 'payment', icon: 'check-circle' },
    { key: 'print', icon: 'printer' },
  ];

  return (
    <section aria-labelledby="trust-heading" className="mt-28 bg-brand py-24 text-surface">
      <div className={SECTION}>
        <Reveal className="max-w-2xl">
          <h2 id="trust-heading" className={HEADING}>
            {t('title')}
          </h2>
          <p className="mt-4 text-xl text-on-brand-2">{t('lead')}</p>
        </Reveal>
        <ul className="mt-14 grid gap-x-10 border-t border-brand-line sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <Reveal
              as="li"
              key={item.key}
              delay={index * 90}
              className="flex flex-col gap-3 border-b border-brand-line py-8 lg:border-b-0"
            >
              <Icon name={item.icon} size={28} />
              <h3 className="text-xl font-semibold">{t(`${item.key}.title`)}</h3>
              <p className="text-lg text-on-brand-2">{t(`${item.key}.body`)}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function FaqSection() {
  const t = await getTranslations('marketing.home');
  const tp = await getTranslations('marketing.pricing.faq');
  const items = [
    { id: 'sources', q: t('faq.sources.q'), a: t('faq.sources.a') },
    { id: 'print', q: t('faq.print.q'), a: t('faq.print.a') },
    { id: 'free', q: tp('free.q'), a: tp('free.a') },
    { id: 'card', q: tp('card.q'), a: tp('card.a') },
    { id: 'ai', q: tp('ai.q'), a: tp('ai.a') },
  ];

  return (
    <section
      aria-labelledby="faq-heading"
      className={`${SECTION} flex flex-wrap gap-x-16 gap-y-8 pt-28`}
    >
      <Reveal className="flex-[1_1_280px]">
        <h2 id="faq-heading" className={HEADING}>
          {t('faqTitle')}
        </h2>
      </Reveal>
      <Reveal delay={100} className="min-w-0 flex-[999_1_560px]">
        <FaqAccordion items={items} />
      </Reveal>
    </section>
  );
}

export async function ClosingSection() {
  const t = await getTranslations('marketing.home');

  return (
    <section aria-labelledby="closing-heading" className={`${SECTION} pt-28 pb-8`}>
      <Reveal className="flex flex-wrap items-center justify-between gap-8 rounded-dialog bg-brand p-[clamp(32px,6vw,80px)] text-surface">
        <div className="max-w-xl">
          <h2 id="closing-heading" className={HEADING}>
            {t('closingTitle')}
          </h2>
          <p className="mt-4 text-xl text-on-brand-2">{t('closingLead')}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-13 items-center rounded-control bg-surface px-6 text-lg font-semibold text-accent-hover transition-colors hover:bg-accent-tint"
        >
          {t('closingAction')}
        </Link>
      </Reveal>
    </section>
  );
}
