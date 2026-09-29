import { getTranslations } from 'next-intl/server';

import { limit, UNLIMITED } from '@testcim/shared';

import { UpgradeNote } from '@/components/patterns/upgrade-note';
import { UsageMeter } from '@/components/patterns/usage-meter';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { getEntitlements } from '@/lib/workspace/entitlements.server';

const TRACKED_METRICS = [
  'pdf_exports_per_month',
  'ai_credits_per_month',
  'omr_scans_per_month',
] as const;

export default async function PlanSettingsPage() {
  const workspace = await getCurrentWorkspace();
  const entitlements = await getEntitlements(workspace.id);
  const supabase = await createClient();

  const periodStart = new Date();
  periodStart.setDate(1);
  const periodStartIso = periodStart.toISOString().slice(0, 10);

  const { data: usage } = await supabase
    .from('usage_counters')
    .select('metric, value')
    .eq('workspace_id', workspace.id)
    .eq('period_start', periodStartIso);

  const usageByMetric = new Map((usage ?? []).map((row) => [row.metric, row.value]));
  const t = await getTranslations('settings.plan');

  return (
    <div className="flex max-w-sm flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
        <p className="mt-1 text-sm text-ink-2">{t('currentPlan', { plan: workspace.planId })}</p>
      </div>

      <div className="flex flex-col gap-4">
        {TRACKED_METRICS.map((metric) => {
          const cap = limit(entitlements, metric);
          const used = usageByMetric.get(metric) ?? 0;

          if (cap === UNLIMITED) {
            return (
              <p key={metric} className="text-sm text-ink-2">
                {t(`metrics.${metric}`)}: {t('unlimited')}
              </p>
            );
          }

          return (
            <UsageMeter
              key={metric}
              label={t(`metrics.${metric}`)}
              value={used}
              max={cap}
              summary={`${used} / ${cap}`}
            />
          );
        })}
      </div>

      {workspace.planId === 'free' && <UpgradeNote message={t('upgradeMessage')} />}
    </div>
  );
}
