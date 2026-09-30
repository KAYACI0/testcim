'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  approveReportCardSummary,
  generateReportCardPdf,
  getLatestReportCardSummary,
  requestReportCardSummary,
  type ReportCardSummaryRow,
} from '@/features/report-cards/actions.server';

function downloadBase64Pdf(base64: string, fileName: string): void {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportCardDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  classId,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly studentId: string;
  readonly studentName: string;
  readonly classId: string;
}) {
  const t = useTranslations('classes.roster.reportCard');
  const [summary, setSummary] = useState<ReportCardSummaryRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfPending, startPdfTransition] = useTransition();
  const [summaryPending, startSummaryTransition] = useTransition();
  const [approvePending, startApproveTransition] = useTransition();

  useEffect(() => {
    void getLatestReportCardSummary(studentId, classId).then(setSummary);
  }, [studentId, classId]);

  function handleDownload() {
    startPdfTransition(async () => {
      const result = await generateReportCardPdf(studentId, classId);
      if (!result.ok) {
        setError(t('downloadError'));
        return;
      }
      downloadBase64Pdf(result.base64, `karne-${studentName}.pdf`);
    });
  }

  function handleRequestSummary() {
    startSummaryTransition(async () => {
      const result = await requestReportCardSummary(studentId, classId);
      if (!result.ok) {
        setError(t('summaryError'));
        return;
      }
      setSummary({ ...result.summary, created_at: new Date().toISOString() });
    });
  }

  function handleApprove() {
    if (!summary) return;
    startApproveTransition(async () => {
      const result = await approveReportCardSummary(summary.id);
      if (!result.ok) {
        setError(t('approveError'));
        return;
      }
      setSummary({ ...summary, status: 'approved' });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('title', { name: studentName })} closeLabel={t('close')}>
        <div className="flex flex-col gap-4">
          {error && <InlineNotice tone="err">{error}</InlineNotice>}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink">{t('summarySectionTitle')}</h3>
            {summary ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-ink-2">{summary.summary_text}</p>
                <p className="text-xs text-ink-2">
                  {summary.status === 'approved' ? t('statusApproved') : t('statusDraft')}
                </p>
                {summary.status === 'draft' && (
                  <Button variant="secondary" loading={approvePending} onClick={handleApprove}>
                    {t('approveAction')}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-2">{t('noSummary')}</p>
            )}
            <Button variant="secondary" loading={summaryPending} onClick={handleRequestSummary}>
              {t('requestSummaryAction')}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t('close')}
            </Button>
            <Button loading={pdfPending} onClick={handleDownload}>
              {t('downloadAction')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
