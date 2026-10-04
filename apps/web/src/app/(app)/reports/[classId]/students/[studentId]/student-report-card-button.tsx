'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ReportCardDialog } from '@/features/report-cards/components/report-card-dialog';

export function StudentReportCardButton({
  studentId,
  studentName,
  classId,
}: {
  readonly studentId: string;
  readonly studentName: string;
  readonly classId: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('reports.student');

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Icon name="file-text" size={16} />
        <span>{t('reportCardAction')}</span>
      </Button>
      <ReportCardDialog
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        studentName={studentName}
        classId={classId}
      />
    </>
  );
}

