import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { PAID_PLAN_IDS } from '@testcim/shared';

import { Button } from '@/components/ui/button';
import { completeFakeCheckout } from '@/features/billing/fake-checkout.server';
import { isFakeBilling } from '@/features/billing/registry.server';

const searchSchema = z.object({
  workspace: z.uuid(),
  plan: z.enum(PAID_PLAN_IDS),
  interval: z.enum(['month', 'year']),
  coupon: z.string().optional(),
});

/** Development stand-in for a provider-hosted payment page. Absent in production. */
export default async function FakeCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isFakeBilling()) {
    notFound();
  }

  const parsed = searchSchema.safeParse(await searchParams);
  if (!parsed.success) {
    notFound();
  }

  const t = await getTranslations('settings.billing.fakeCheckout');
  const query = parsed.data;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-[22px] font-semibold text-ink">{t('title')}</h1>
      <p className="text-sm text-ink-2">{t('description')}</p>
      <p className="text-sm text-ink">
        {t('summary', { plan: query.plan, interval: query.interval })}
      </p>
      <form action={completeFakeCheckout} className="flex gap-2">
        <input type="hidden" name="workspaceId" value={query.workspace} />
        <input type="hidden" name="planId" value={query.plan} />
        <input type="hidden" name="interval" value={query.interval} />
        {query.coupon && <input type="hidden" name="couponCode" value={query.coupon} />}
        <Button type="submit">{t('complete')}</Button>
        <Button asChild variant="secondary">
          <a href="/settings/billing">{t('back')}</a>
        </Button>
      </form>
    </main>
  );
}
