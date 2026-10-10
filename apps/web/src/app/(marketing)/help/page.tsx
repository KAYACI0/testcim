import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { jsonLdString, marketingMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return marketingMetadata('help');
}

const GUIDE_IDS = ['capture', 'crop', 'export', 'omr', 'online'] as const;
const FAQ_IDS = ['paste', 'formats', 'ai', 'cancel'] as const;

export default async function HelpPage() {
  const t = await getTranslations('marketing.help');

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

      <section className="mt-12" aria-labelledby="guide-heading">
        <h2 id="guide-heading" className="text-2xl font-semibold text-ink">
          {t('guideTitle')}
        </h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {GUIDE_IDS.map((id) => (
            <section key={id} className="grid gap-2 py-5 sm:grid-cols-[14rem_1fr] sm:gap-8">
              <h3 className="font-medium text-ink">{t(`guide.${id}.title`)}</h3>
              <p className="max-w-2xl text-ink-2">{t(`guide.${id}.body`)}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="faq-heading">
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

      <p className="mt-8 text-ink-2">
        {t('contactPrompt')}{' '}
        <Link href="/contact" className="font-medium text-accent hover:underline">
          {t('contactLink')}
        </Link>
        .
      </p>
    </div>
  );
}
