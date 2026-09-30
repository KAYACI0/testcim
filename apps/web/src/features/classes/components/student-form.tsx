'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import { addStudent, updateStudent, type StudentRow } from '@/features/classes/actions.server';

type StudentFormProps =
  | { readonly mode: 'add'; readonly classId: string; readonly onDone: () => void }
  | {
      readonly mode: 'edit';
      readonly student: StudentRow;
      readonly open: boolean;
      readonly onOpenChange: (open: boolean) => void;
      readonly onDone: () => void;
    };

export function StudentForm(props: StudentFormProps) {
  const t = useTranslations('classes.roster.addStudent');
  const [studentNo, setStudentNo] = useState(
    props.mode === 'edit' ? (props.student.student_no ?? '') : '',
  );
  const [fullName, setFullName] = useState(props.mode === 'edit' ? props.student.full_name : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [internalOpen, setInternalOpen] = useState(false);

  const open = props.mode === 'edit' ? props.open : internalOpen;
  const setOpen = props.mode === 'edit' ? props.onOpenChange : setInternalOpen;

  function handleSubmit() {
    startTransition(async () => {
      const result =
        props.mode === 'add'
          ? await addStudent({
              classId: props.classId,
              studentNo: studentNo || undefined,
              fullName,
            })
          : await updateStudent({
              studentId: props.student.id,
              studentNo: studentNo || undefined,
              fullName,
            });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setOpen(false);
      if (props.mode === 'add') {
        setStudentNo('');
        setFullName('');
      }
      props.onDone();
    });
  }

  const dialog = (
    <DialogContent
      title={props.mode === 'add' ? t('add') : t('save')}
      closeLabel={t('cancel')}
      className="max-w-sm"
    >
      <div className="flex flex-col gap-4">
        <FormField label={t('fullNameLabel')} required>
          {(fieldProps) => (
            <Input {...fieldProps} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          )}
        </FormField>
        <FormField label={t('studentNoLabel')}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={studentNo}
              onChange={(e) => setStudentNo(e.target.value)}
            />
          )}
        </FormField>
        {error && <InlineNotice tone="err">{error}</InlineNotice>}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button loading={pending} disabled={!fullName.trim()} onClick={handleSubmit}>
            {props.mode === 'add' ? t('add') : t('save')}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );

  if (props.mode === 'edit') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialog}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">{t('add')}</Button>
      </DialogTrigger>
      {dialog}
    </Dialog>
  );
}
