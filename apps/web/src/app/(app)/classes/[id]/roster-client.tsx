'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import {
  archiveStudent,
  bulkDeleteStudents,
  updateRetention,
  type StudentRow,
} from '@/features/classes/actions.server';
import { ImportRosterDialog } from '@/features/classes/components/import-roster-dialog';
import { StudentForm } from '@/features/classes/components/student-form';

export function RosterClient({
  classId,
  students,
  retentionUntil,
}: {
  readonly classId: string;
  readonly students: readonly StudentRow[];
  readonly retentionUntil: string | null;
}) {
  const t = useTranslations('classes.roster');
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [retentionValue, setRetentionValue] = useState(retentionUntil ?? '');
  const [retentionPending, startRetentionTransition] = useTransition();
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [archivePending, startArchiveTransition] = useTransition();

  function handleRetentionSave() {
    startRetentionTransition(async () => {
      await updateRetention({ classId, retentionUntil: retentionValue || null });
      router.refresh();
    });
  }

  function handleArchive(studentId: string) {
    startArchiveTransition(async () => {
      await archiveStudent(studentId);
      router.refresh();
    });
  }

  const columns: DataTableColumn<StudentRow>[] = [
    {
      key: 'studentNo',
      header: t('columns.studentNo'),
      sortable: true,
      sortValue: (row) => row.student_no ?? '',
      render: (row) => row.student_no ?? '—',
    },
    {
      key: 'fullName',
      header: t('columns.fullName'),
      sortable: true,
      sortValue: (row) => row.full_name,
      render: (row) => row.full_name,
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      render: (row) => (
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            className="text-ink-2 hover:text-accent"
            onClick={() => setEditingStudent(row)}
          >
            {t('actions.edit')}
          </button>
          <button
            type="button"
            className="text-ink-2 hover:text-err disabled:opacity-40"
            disabled={archivePending}
            onClick={() => handleArchive(row.id)}
          >
            {t('actions.archive')}
          </button>
        </div>
      ),
    },
  ];

  function handleDelete() {
    startTransition(async () => {
      const result = await bulkDeleteStudents({ studentIds: Array.from(selectedIds) });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setSelectedIds(new Set());
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ImportRosterDialog classId={classId} onImported={() => router.refresh()} />
          <StudentForm classId={classId} mode="add" onDone={() => router.refresh()} />
        </div>
        {selectedIds.size > 0 && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">{t('bulkDeleteTrigger')}</Button>
            </DialogTrigger>
            <DialogContent
              title={t('bulkDeleteConfirmTitle')}
              description={t('bulkDeleteConfirmMessage')}
              closeLabel={t('cancel')}
            >
              {error && <InlineNotice tone="err">{error}</InlineNotice>}
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button variant="primary" loading={pending} onClick={handleDelete}>
                  {t('bulkDeleteConfirm')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={students}
        getRowId={(row) => row.id}
        emptyMessage={t('empty')}
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        selectAllLabel={t('bulkDeleteTrigger')}
        selectRowLabel={(row) => row.full_name}
      />

      {editingStudent && (
        <StudentForm
          key={editingStudent.id}
          mode="edit"
          student={editingStudent}
          open={editingStudent !== null}
          onOpenChange={(next) => {
            if (!next) setEditingStudent(null);
          }}
          onDone={() => {
            setEditingStudent(null);
            router.refresh();
          }}
        />
      )}

      <div className="flex items-end gap-3 border-t border-line pt-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="retention-until" className="text-sm font-medium text-ink">
            {t('retentionLabel')}
          </label>
          <Input
            id="retention-until"
            type="date"
            value={retentionValue}
            onChange={(event) => setRetentionValue(event.target.value)}
            className="w-44"
          />
          <p className="text-xs text-ink-2">{t('retentionHint')}</p>
        </div>
        <Button variant="secondary" loading={retentionPending} onClick={handleRetentionSave}>
          {t('retentionSave')}
        </Button>
      </div>
    </div>
  );
}
