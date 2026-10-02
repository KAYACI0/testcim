import { redirect } from 'next/navigation';

/** Plan and usage moved into the billing screen; keep old links working. */
export default function PlanSettingsPage() {
  redirect('/settings/billing');
}
