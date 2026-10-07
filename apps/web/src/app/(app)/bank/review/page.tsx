import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/patterns/page-header';
import { ReviewTray } from '@/features/ai/components/review-tray';
import { getAiCreditsInfo, listDraftQuestions } from '@/features/ai/question-actions.server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

export default async function BankReviewPage() {
  const workspace = await getCurrentWorkspace();
  const t = await getTranslations('ai');
  const [drafts, credits] = await Promise.all([listDraftQuestions(), getAiCreditsInfo()]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('tray.title')}
        description={t('tray.description')}
        action={
          <Link href="/bank" className="text-sm font-medium text-accent hover:underline">
            {t('tray.back')}
          </Link>
        }
      />
      <ReviewTray
        workspaceId={workspace.id}
        initialDrafts={drafts}
        creditCosts={{ qualityCheck: credits.costs.qualityCheck }}
      />
    </div>
  );
}
