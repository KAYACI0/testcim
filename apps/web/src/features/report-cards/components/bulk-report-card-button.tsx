'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { InlineNotice } from '@/components/ui/inline-notice';
import { useBulkReportCards } from '@/features/report-cards/use-bulk-report-cards';

export function BulkReportCardButton({ classId }: { readonly classId: string }) {
  const t = useTranslations('classes.roster.bulkReportCard');
  const { busy, progress, outcome, download } = useBulkReportCards(classId);

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" size="sm" loading={busy} onClick={download}>
        <Icon name="file-text" size={16} />
        <span>
          {busy && progress
            ? t('progress', { done: progress.done, total: progress.total })
            : t('trigger')}
        </span>
      </Button>
      {outcome === 'empty' && <InlineNotice tone="warn">{t('empty')}</InlineNotice>}
      {outcome === 'failed' && <InlineNotice tone="err">{t('error')}</InlineNotice>}
    </div>
  );
}
