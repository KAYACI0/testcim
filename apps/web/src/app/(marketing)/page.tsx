import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatMinor, monthlyEquivalentMinor } from '@testcim/shared';

import { FeatureBlocks } from '@/features/marketing/feature-blocks';
import { HeroVisual } from '@/features/marketing/hero-visual';
import { PasteDemo } from '@/features/marketing/paste-demo';
import { getPublicPlans } from '@/features/marketing/plans.server';
import { PricingPreview, type PricingPreviewTier } from '@/features/marketing/pricing-preview';
import { SubjectMarquee } from '@/features/marketing/subject-marquee';
import { jsonLdString, marketingMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 300;

export async function generateMetadata() {
  return marketingMetadata('home');
}

const TIER_IDS = ['free', 'plus', 'team'] as const;

async function loadPlans() {
  try {
    return await getPublicPlans();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const t = await getTranslations('marketing.home');
  const tp = await getTranslations('marketing.pages.home');
  const tt = await getTranslations('marketing.pricing');
  const plans = await loadPlans();

  const tiers: PricingPreviewTier[] = TIER_IDS.map((id) => {
    const plan = plans.find((candidate) => candidate.id === id);
    const name = id === 'plus' ? (plan?.name ?? 'Plus') : t(`pricing.tiers.${id}.name`);

    return {
      id,
      name,
      description: t(`pricing.tiers.${id}.description`),
      points: t.raw(`pricing.tiers.${id}.points`) as string[],
      monthly:
        plan?.priceMonthlyMinor == null ? null : formatMinor(plan.priceMonthlyMinor, plan.currency),
      yearly:
        plan?.priceYearlyMinor == null ? null : formatMinor(plan.priceYearlyMinor, plan.currency),
      yearlyPerMonth:
        plan?.priceYearlyMinor == null
          ? null
          : formatMinor(monthlyEquivalentMinor(plan.priceYearlyMinor), plan.currency),
      cta: id === 'free' ? tt('startFree') : tt('startWith', { plan: name }),
      featured: id === 'plus',
    };
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Testcim',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    inLanguage: 'tr',
    url: absoluteUrl('/'),
    description: tp('description'),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(structuredData) }}
      />

      <section className="relative isolate overflow-hidden">
        <svg
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full text-line-strong/50"
        >
          <defs>
            <pattern id="hero-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>
        <div
          aria-hidden="true"
          className="hero-blob absolute -top-24 -left-16 -z-10 h-72 w-72 rounded-dialog bg-accent/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="hero-blob absolute top-24 -right-10 -z-10 h-80 w-80 rounded-dialog bg-warn/25 blur-3xl [animation-delay:-5s]"
        />
        <div
          aria-hidden="true"
          className="hero-blob absolute -bottom-24 left-1/3 -z-10 h-64 w-64 rounded-dialog bg-ok/20 blur-3xl [animation-delay:-8s]"
        />

        <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 pt-14 pb-16 sm:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-8">
          <div>
            <p
              className="hero-rise inline-flex items-center gap-2 rounded-control border border-accent/20 bg-accent-tint px-3 py-1 text-sm font-medium text-accent"
              style={{ ['--hero-i' as string]: 0 }}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-thumb bg-accent opacity-60" />
                <span className="relative inline-flex size-2 rounded-thumb bg-accent" />
              </span>
              {t('hero.eyebrow')}
            </p>
            <h1
              className="hero-rise mt-5 max-w-xl text-4xl leading-tight font-semibold text-balance text-ink isolate sm:text-5xl"
              style={{ ['--hero-i' as string]: 1 }}
            >
              {t.rich('title', {
                mark: (chunks) => <mark className="hero-mark">{chunks}</mark>,
              })}
            </h1>
            <p
              className="hero-rise mt-5 max-w-xl text-lg text-ink-2"
              style={{ ['--hero-i' as string]: 2 }}
            >
              {t('lead')}
            </p>
            <div
              className="hero-rise mt-8 flex flex-wrap gap-3"
              style={{ ['--hero-i' as string]: 3 }}
            >
              <Link
                href="/login"
                className="group inline-flex h-12 items-center gap-2 rounded-control bg-accent px-6 text-lg font-medium text-surface shadow-float transition-transform duration-(--duration-base) ease-(--ease-out) hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0"
              >
                {t('primaryCta')}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
              <a
                href="#demo"
                className="inline-flex h-12 items-center rounded-control border border-line-strong bg-surface px-6 text-lg font-medium text-ink transition-transform duration-(--duration-base) ease-(--ease-out) hover:-translate-y-0.5 hover:bg-canvas active:translate-y-0"
              >
                {t('secondaryCta')}
              </a>
            </div>
          </div>

          <div className="hero-rise" style={{ ['--hero-i' as string]: 3 }}>
            <HeroVisual />
          </div>
        </div>
      </section>

      <SubjectMarquee />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div id="demo" className="scroll-mt-6">
          <h2 className="sr-only">{t('demoTitle')}</h2>
          <PasteDemo />
        </div>
      </section>

      <section className="border-y border-line" aria-label={t('trust.label')}>
        <dl className="mx-auto grid max-w-5xl divide-y divide-line px-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex items-baseline gap-3 py-6 sm:pr-8">
            <dd className="order-1 text-3xl font-semibold text-ink tabular-nums">
              {t('trust.questionsValue')}
            </dd>
            <dt className="order-2 text-ink-2">{t('trust.questionsLabel')}</dt>
          </div>
          <div className="flex items-baseline gap-3 py-6 sm:pl-8">
            <dd className="order-1 text-3xl font-semibold text-ink">{t('trust.teachersValue')}</dd>
            <dt className="order-2 text-ink-2">{t('trust.teachersLabel')}</dt>
          </div>
        </dl>
      </section>

      <section aria-labelledby="features-heading">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 id="features-heading" className="text-3xl font-semibold text-ink">
            {t('featuresTitle')}
          </h2>
          <FeatureBlocks />
          <p className="mt-8 text-sm">
            <Link href="/features" className="font-medium text-accent hover:underline">
              {t('featuresMore')}
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-canvas" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 id="pricing-heading" className="text-3xl font-semibold text-ink">
            {t('pricing.title')}
          </h2>
          <p className="mt-2 mb-8 text-ink-2">{t('pricing.lead')}</p>
          <PricingPreview tiers={tiers} />
          <p className="mt-8 text-sm">
            <Link href="/pricing" className="font-medium text-accent hover:underline">
              {t('pricing.compare')}
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 px-6 py-16">
          <h2 className="text-3xl font-semibold text-ink">{t('closingTitle')}</h2>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-control bg-accent px-5 text-base font-medium text-surface hover:bg-accent-hover"
          >
            {t('closingAction')}
          </Link>
        </div>
      </section>
    </>
  );
}
