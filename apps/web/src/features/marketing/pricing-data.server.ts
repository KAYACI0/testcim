import 'server-only';

import { getFormatter, getTranslations } from 'next-intl/server';

import { formatMinor, monthlyEquivalentMinor } from '@testcim/shared';

import { ENTITLEMENT_ROWS, toCell, type CellValue } from './entitlement-rows';
import { getPublicPlans } from './plans.server';

import type { PricingPlan, PricingRow } from './pricing-table';

/** Plans and rows for `PricingTable`, shared by the home and pricing pages. */
export async function getPricingTableData(): Promise<{
  plans: PricingPlan[];
  rows: PricingRow[];
}> {
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

  return {
    plans: plans.map((plan) => ({
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
    })),
    rows: ENTITLEMENT_ROWS.map((row) => ({
      key: row.key,
      label: t(`rows.${row.key}`),
      cells: plans.map((plan) => cellText(toCell(row, plan.entitlements[row.key]))),
    })),
  };
}
