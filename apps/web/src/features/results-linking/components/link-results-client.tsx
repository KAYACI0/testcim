'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';

import type { StudentRow } from '@/features/classes/actions.server';
import type {
  UnmatchedExamAttempt,
  UnmatchedOmrScan,
} from '@/features/results-linking/actions.server';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { linkResults } from '@/features/results-linking/actions.server';

const NO_STUDENT = '__none__';

function suggestStudentId(studentNo: string | null, students: readonly StudentRow[]): string {
  if (!studentNo) return NO_STUDENT;
  const match = students.find((s) => s.student_no === studentNo);
  return match?.id ?? NO_STUDENT;
}

export function LinkResultsClient({
  students,
  examAttempts,
  omrScans,
}: {
  readonly students: readonly StudentRow[];
  readonly examAttempts: readonly UnmatchedExamAttempt[];
  readonly omrScans: readonly UnmatchedOmrScan[];
}) {
  const t = useTranslations('classes.linkResults');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [attemptSelections, setAttemptSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(examAttempts.map((a) => [a.id, suggestStudentId(a.studentNo, students)])),
  );
  const [scanSelections, setScanSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(omrScans.map((s) => [s.id, suggestStudentId(s.studentNoRead, students)])),
  );

  const totalSelected = useMemo(() => {
    const attemptCount = Object.values(attemptSelections).filter((v) => v !== NO_STUDENT).length;
    const scanCount = Object.values(scanSelections).filter((v) => v !== NO_STUDENT).length;
    return attemptCount + scanCount;
  }, [attemptSelections, scanSelections]);

  function studentPicker(value: string, onChange: (value: string) => void) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={t('pickStudent')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_STUDENT}>{t('pickStudent')}</SelectItem>
          {students.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.full_name}
              {s.student_no ? ` (${s.student_no})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const attemptColumns: DataTableColumn<UnmatchedExamAttempt>[] = [
    { key: 'examTitle', header: t('columns.source'), render: (row) => row.examTitle },
    {
      key: 'studentNo',
      header: t('columns.studentNo'),
      render: (row) => row.studentNo ?? row.displayName ?? '—',
    },
    {
      key: 'student',
      header: t('columns.student'),
      render: (row) =>
        studentPicker(attemptSelections[row.id] ?? NO_STUDENT, (value) =>
          setAttemptSelections((prev) => ({ ...prev, [row.id]: value })),
        ),
    },
  ];

  const scanColumns: DataTableColumn<UnmatchedOmrScan>[] = [
    {
      key: 'studentNoRead',
      header: t('columns.studentNo'),
      render: (row) => row.studentNoRead ?? '—',
    },
    {
      key: 'student',
      header: t('columns.student'),
      render: (row) =>
        studentPicker(scanSelections[row.id] ?? NO_STUDENT, (value) =>
          setScanSelections((prev) => ({ ...prev, [row.id]: value })),
        ),
    },
  ];

  function handleApply() {
    const links = [
      ...examAttempts
        .filter((a) => (attemptSelections[a.id] ?? NO_STUDENT) !== NO_STUDENT)
        .map((a) => ({
          kind: 'exam_attempt' as const,
          id: a.id,
          studentId: attemptSelections[a.id] as string,
        })),
      ...omrScans
        .filter((s) => (scanSelections[s.id] ?? NO_STUDENT) !== NO_STUDENT)
        .map((s) => ({
          kind: 'omr_scan' as const,
          id: s.id,
          studentId: scanSelections[s.id] as string,
        })),
    ];
    if (links.length === 0) return;

    startTransition(async () => {
      const result = await linkResults({ links });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <InlineNotice tone="err">{error}</InlineNotice>}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">{t('omrSectionTitle')}</h2>
        <DataTable
          columns={scanColumns}
          rows={omrScans}
          getRowId={(row) => row.id}
          emptyMessage={t('empty')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">{t('examSectionTitle')}</h2>
        <DataTable
          columns={attemptColumns}
          rows={examAttempts}
          getRowId={(row) => row.id}
          emptyMessage={t('empty')}
        />
      </div>

      <div>
        <Button onClick={handleApply} loading={pending} disabled={totalSelected === 0}>
          {t('applyAction', { count: totalSelected })}
        </Button>
      </div>
    </div>
  );
}
