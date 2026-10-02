import { getFormatter, getTranslations } from 'next-intl/server';

import { formatMinor, monthlyEquivalentMinor } from '@testcim/shared';

import { ENTITLEMENT_ROWS, toCell, type CellValue } from '@/features/marketing/entitlement-rows';
import { getPublicPlans } from '@/features/marketing/plans.server';
import { PricingTable } from '@/features/marketing/pricing-table';
import { jsonLdString, marketingMetadata } from '@/lib/seo';

// Prices and limits come from the plans table; refresh the static page every few minutes.
export const revalidate = 300;

export async function generateMetadata() {
  return marketingMetadata('pricing');
}

const FAQ_IDS = ['free', 'cancel', 'card', 'seats', 'trial', 'ai'] as const;

export default async function PricingPage() {
  const t = await getTranslations('marketing.pricing');
  const format = await getFormatter();
  const plans = await getPublicPlans();

  function cellText(cell: CellValue): string {
    switch (cell.type) {
      case 'number':
        return format.number(cell.value);
      case 'storage':
        return cell.megabytes >= 1000
          ? t('cells.storageGb', { value: format.number(cell.megabytes / 1000) })
          : t('cells.storageMb', { value: format.number(cell.megabytes) });
      case 'tier':
        return t(`cells.${cell.tier}`);
      default:
        return t(`cells.${cell.type}`);
    }
  }

  const tablePlans = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    monthly:
      plan.priceMonthlyMinor === null ? null : formatMinor(plan.priceMonthlyMinor, plan.currency),
    yearly:
      plan.priceYearlyMinor === null ? null : formatMinor(plan.priceYearlyMinor, plan.currency),
    yearlyPerMonth:
      plan.priceYearlyMinor === null
        ? null
        : formatMinor(monthlyEquivalentMinor(plan.priceYearlyMinor), plan.currency),
  }));

  const rows = ENTITLEMENT_ROWS.map((row) => ({
    key: row.key,
    label: t(`rows.${row.key}`),
    cells: plans.map((plan) => cellText(toCell(row, plan.entitlements[row.key]))),
  }));

  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_IDS.map((id) => ({
      '@type': 'Question',
      name: t(`faq.${id}.q`),
      acceptedAnswer: { '@type': 'Answer', text: t(`faq.${id}.a`) },
    })),
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(faqData) }}
      />
      <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">{t('lead')}</p>

      <div className="mt-8">
        {plans.length === 0 ? (
          <p className="text-ink-2">{t('unavailable')}</p>
        ) : (
          <PricingTable plans={tablePlans} rows={rows} />
        )}
      </div>

      <section className="mt-16" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-semibold text-ink">
          {t('faqTitle')}
        </h2>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          {FAQ_IDS.map((id) => (
            <div key={id} className="grid gap-1 py-4 sm:grid-cols-[20rem_1fr] sm:gap-6">
              <dt className="font-medium text-ink">{t(`faq.${id}.q`)}</dt>
              <dd className="text-ink-2">{t(`faq.${id}.a`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
