import { getTranslations } from 'next-intl/server';

import { marketingMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return marketingMetadata('status');
}

export default async function StatusPage() {
  const t = await getTranslations('marketing.status');

  const services = [
    { name: t('webApp'), status: t('statusOperational') },
    { name: t('database'), status: t('statusOperational') },
    { name: t('storage'), status: t('statusOperational') },
    { name: t('realtime'), status: t('statusOperational') },
    { name: t('workers'), status: t('statusOperational') },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{t('title')}</h1>

      <div className="mt-8 flex items-center gap-3 rounded-control border border-line bg-canvas p-4">
        <span className="h-2.5 w-2.5 rounded-sm bg-ok" />
        <span className="font-medium text-ink">{t('operational')}</span>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{t('servicesTitle')}</h2>
        <div className="mt-4 divide-y divide-line rounded-control border border-line">
          {services.map((service, index) => (
            <div key={index} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-ink">{service.name}</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ok">
                <span className="h-1.5 w-1.5 rounded-sm bg-ok" />
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-xs text-ink-3">{t('updatedAt')}</p>
    </div>
  );
}
