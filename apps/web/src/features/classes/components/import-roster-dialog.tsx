'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import type { RosterMappingResult } from '../import';
import type { ParsedSpreadsheet } from '../parse-spreadsheet';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { importRoster } from '@/features/classes/actions.server';
import { mapRosterRows } from '@/features/classes/import';
import { parseSpreadsheetFile } from '@/features/classes/parse-spreadsheet';

const NO_COLUMN = '__none__';

type Step = 'file' | 'map' | 'preview';

export function ImportRosterDialog({
  classId,
  onImported,
}: {
  readonly classId: string;
  readonly onImported: () => void;
}) {
  const t = useTranslations('classes.import');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('file');
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [studentNoColumn, setStudentNoColumn] = useState(NO_COLUMN);
  const [fullNameColumn, setFullNameColumn] = useState<string | null>(null);
  const [mapping, setMapping] = useState<RosterMappingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep('file');
    setParsed(null);
    setStudentNoColumn(NO_COLUMN);
    setFullNameColumn(null);
    setMapping(null);
    setError(null);
  }

  async function handleFile(file: File) {
    const result = await parseSpreadsheetFile(file);
    setParsed(result);
    setFullNameColumn(result.headers[0] ?? null);
    setStep('map');
  }

  function handleMapConfirm() {
    if (!parsed || !fullNameColumn) return;
    setMapping(
      mapRosterRows(
        parsed.rows,
        studentNoColumn === NO_COLUMN ? { fullNameColumn } : { studentNoColumn, fullNameColumn },
      ),
    );
    setStep('preview');
  }

  function handleConfirmImport() {
    if (!mapping) return;
    startTransition(async () => {
      const result = await importRoster({ classId, rows: mapping.valid });
      if (!result.ok) {
        setError(t('importError'));
        return;
      }
      setOpen(false);
      reset();
      onImported();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Icon name="upload-simple" size={16} />
          {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent title={t('title')} closeLabel={t('cancel')} className="max-w-lg">
        {step === 'file' && (
          <FormField label={t('fileLabel')} hint={t('fileHint')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            )}
          </FormField>
        )}

        {step === 'map' && parsed && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2">{t('mapStepTitle')}</p>
            <FormField label={t('fullNameColumnLabel')} required>
              {(fieldProps) => (
                <Select
                  {...(fullNameColumn ? { value: fullNameColumn } : {})}
                  onValueChange={setFullNameColumn}
                >
                  <SelectTrigger id={fieldProps.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {parsed.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label={t('studentNoColumnLabel')}>
              {(fieldProps) => (
                <Select value={studentNoColumn} onValueChange={setStudentNoColumn}>
                  <SelectTrigger id={fieldProps.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COLUMN}>{t('noColumn')}</SelectItem>
                    {parsed.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setStep('file')}>
                {t('cancel')}
              </Button>
              <Button onClick={handleMapConfirm} disabled={!fullNameColumn}>
                {t('previewTitle')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && mapping && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              {t('successMessage', { inserted: mapping.valid.length })}
            </p>
            {mapping.errors.length > 0 && (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm text-err">
                {mapping.errors.map((rowError) => (
                  <p key={rowError.rowIndex}>
                    {t('rowError', {
                      row: rowError.rowIndex + 1,
                      reason: t(
                        rowError.reason === 'full_name_required'
                          ? 'reasonFullNameRequired'
                          : 'reasonDuplicateStudentNo',
                      ),
                    })}
                  </p>
                ))}
              </div>
            )}
            {error && <InlineNotice tone="err">{error}</InlineNotice>}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setStep('map')}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleConfirmImport}
                loading={pending}
                disabled={mapping.valid.length === 0}
              >
                {t('confirm')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
