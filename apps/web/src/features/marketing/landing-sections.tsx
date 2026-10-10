import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { FEATURE_KEYS } from './feature-keys';

import type { ReactNode } from 'react';

import { Icon } from '@/components/ui/icon';

const SECTION = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
const HEADING =
  'font-display text-[clamp(30px,4vw,46px)] leading-[1.15] font-semibold tracking-[-0.01em]';

/** Features listed under the showcases; crop, booklets and omr have their own rows. */
const LISTED_FEATURES = FEATURE_KEYS.filter(
  (key) => key !== 'crop' && key !== 'booklets' && key !== 'omr',
);

export async function FlowSection() {
  const t = await getTranslations('marketing.home.flow');
  const steps = ['paste', 'answer', 'export'] as const;

  return (
    <section aria-labelledby="flow-heading" className={`${SECTION} pt-32`}>
      <h2 id="flow-heading" className={`${HEADING} max-w-2xl`}>
        {t('title')}
      </h2>
      <ol className="mt-12 flex flex-wrap border-t border-brand-line">
        {steps.map((step) => (
          <li key={step} className="flex flex-[1_1_280px] flex-col gap-3 pt-7 pr-8 pb-2">
            <kbd className="self-start rounded-control bg-surface px-3 py-1.5 font-sans text-base font-semibold text-accent-hover shadow-key">
              {t(`${step}.key`)}
            </kbd>
            <h3 className="text-xl font-semibold">{t(`${step}.title`)}</h3>
            <p className="max-w-sm text-on-brand-2">{t(`${step}.body`)}</p>
          </li>
        ))}
      </ol>
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
    <div
      className={`mt-24 flex items-center gap-12 first:mt-16 ${reverse ? 'flex-row-reverse flex-wrap-reverse' : 'flex-wrap'}`}
    >
      <div className="max-w-md flex-[1_1_340px]">
        <h3 className="text-[26px] leading-tight font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mt-3.5 text-on-brand-2">{body}</p>
      </div>
      <div
        className="sheet flex-[1_1_480px] rounded-panel bg-surface p-7 text-base text-ink"
        aria-hidden="true"
      >
        {visual}
      </div>
    </div>
  );
}

function Lines({
  widths,
  tone = 'bg-sketch',
}: {
  readonly widths: string[];
  readonly tone?: string;
}) {
  return (
    <>
      {widths.map((width, index) => (
        <span key={index} className={`block h-1.5 ${tone} ${width}`} />
      ))}
    </>
  );
}

export async function FeaturesSection() {
  const t = await getTranslations('marketing.home');
  const ts = await getTranslations('marketing.home.showcase');
  const tf = await getTranslations('marketing.featureItems');

  return (
    <section id="features" aria-labelledby="features-heading" className={`${SECTION} pt-32`}>
      <h2 id="features-heading" className={`${HEADING} max-w-2xl`}>
        {t('featuresTitle')}
      </h2>

      <Showcase
        title={ts('crop.title')}
        body={tf('crop.detail')}
        visual={
          <div className="flex items-start gap-5">
            <div className="flex flex-1 flex-col gap-3.5 rounded-paper bg-canvas p-4">
              <div className="flex flex-col gap-1.5 rounded-paper border-[1.5px] border-accent bg-accent-tint p-2.5">
                <Lines widths={['w-full', 'w-3/4', 'w-1/2']} tone="bg-line-strong" />
              </div>
              <div className="flex flex-col gap-1.5 rounded-paper border-[1.5px] border-dashed border-accent p-2.5">
                <Lines widths={['w-full', 'w-2/3']} />
              </div>
              <div className="flex flex-col gap-1.5 p-2.5">
                <Lines widths={['w-full', 'w-4/5']} />
              </div>
            </div>
            <div className="hidden w-40 shrink-0 flex-col text-sm sm:flex">
              <span className="pb-1.5 text-ink-2">{ts('crop.listTitle')}</span>
              <span className="flex justify-between border-b border-line py-1.5">
                {ts('crop.item', { number: 14 })}
                <span className="text-ok">{ts('crop.added')}</span>
              </span>
              <span className="flex justify-between border-b border-line py-1.5">
                {ts('crop.item', { number: 15 })}
                <span className="text-accent">{ts('crop.selected')}</span>
              </span>
              <span className="flex justify-between py-1.5">
                {ts('crop.item', { number: 16 })}
                <span className="text-ink-3">{ts('crop.waiting')}</span>
              </span>
            </div>
          </div>
        }
      />

      <Showcase
        reverse
        title={ts('booklets.title')}
        body={tf('booklets.detail')}
        visual={
          <div className="flex items-end justify-center gap-3.5">
            {['A', 'B', 'C'].map((letter, index) => (
              <div
                key={letter}
                className={`flex aspect-[0.71] w-1/4 flex-col gap-1.5 rounded-paper p-2.5 text-xs ${index === 2 ? 'border-[1.5px] border-accent' : 'border border-line-strong'}`}
              >
                <span className={`font-semibold ${index === 2 ? 'text-accent' : ''}`}>
                  {letter}
                </span>
                <Lines
                  widths={
                    index === 1 ? ['w-3/5', 'w-full', 'w-full'] : ['w-full', 'w-full', 'w-3/5']
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
            <div className="flex justify-between border-b border-line py-2.5">
              <span>{ts('omr.row', { number: 1 })}</span>
              <span className="tabular-nums">{ts('omr.score', { score: 17, total: 20 })}</span>
            </div>
            <div className="flex justify-between border-b border-line py-2.5">
              <span>{ts('omr.row', { number: 2 })}</span>
              <span className="tabular-nums">{ts('omr.score', { score: 14, total: 20 })}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span>{ts('omr.row', { number: 3 })}</span>
              <span className="text-warn">{ts('omr.review')}</span>
            </div>
          </div>
        }
      />

      <ul className="mt-28 border-t border-brand-line">
        {LISTED_FEATURES.map((key) => (
          <li key={key} className="flex flex-wrap gap-x-12 gap-y-2 border-b border-brand-line py-5">
            <h3 className="flex-[0_1_300px] text-xl font-semibold">{tf(`${key}.title`)}</h3>
            <p className="flex-[1_1_420px] text-on-brand-2">{tf(`${key}.summary`)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <Link href="/features" className="font-medium underline-offset-4 hover:underline">
          {t('featuresMore')}
        </Link>
      </p>
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
      className={`${SECTION} flex flex-wrap gap-x-16 gap-y-8 pt-32`}
    >
      <h2 id="faq-heading" className={`${HEADING} flex-[1_1_280px]`}>
        {t('faqTitle')}
      </h2>
      <div className="min-w-0 flex-[999_1_560px] border-t border-brand-line">
        {items.map((item) => (
          <details key={item.id} className="group border-b border-brand-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-xl font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="shrink-0 group-open:hidden">
                <Icon name="plus" />
              </span>
              <span className="hidden shrink-0 group-open:inline">
                <Icon name="minus" />
              </span>
            </summary>
            <p className="max-w-2xl pb-5 text-on-brand-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export async function ClosingSection() {
  const t = await getTranslations('marketing.home');

  return (
    <section aria-labelledby="closing-heading" className={`${SECTION} pt-32`}>
      <div className="sheet flex flex-wrap items-center justify-between gap-8 rounded-dialog bg-surface p-[clamp(32px,6vw,72px)] text-ink">
        <div className="max-w-xl">
          <h2 id="closing-heading" className={HEADING}>
            {t('closingTitle')}
          </h2>
          <p className="mt-3.5 text-ink-2">{t('closingLead')}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-13 items-center rounded-control bg-accent px-6 text-lg font-semibold text-surface hover:bg-accent-hover"
        >
          {t('closingAction')}
        </Link>
      </div>
    </section>
  );
}
