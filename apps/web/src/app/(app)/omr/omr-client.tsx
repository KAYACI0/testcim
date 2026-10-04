'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
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
import { generateOmrFormPdfAction } from '@/features/omr/actions.server';

export interface TestSummary {
  readonly id: string;
  readonly title: string;
  readonly question_count: number;
}

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

export function OmrClient({ tests }: { readonly tests: readonly TestSummary[] }) {
  const t = useTranslations('omr');
  const [selectedTestId, setSelectedTestId] = useState<string>('custom');
  const [title, setTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(20);
  const [optionsCount, setOptionsCount] = useState<4 | 5>(4);
  const [digits, setDigits] = useState(4);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTestSelect = (value: string) => {
    setSelectedTestId(value);
    if (value !== 'custom') {
      const found = tests.find((item) => item.id === value);
      if (found) {
        setTitle(found.title);
        setQuestionCount(found.question_count > 0 ? found.question_count : 20);
      }
    }
  };

  const handleGenerate = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await generateOmrFormPdfAction({
        testTitle: title || undefined,
        questionCount,
        optionsCount,
        studentNumberDigits: digits,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      downloadBase64Pdf(result.base64, result.fileName);
      setSuccess(t('downloadSuccess'));
    });
  };

  return (
    <div className="flex flex-col gap-8 p-6 max-w-4xl">
      {/* Quick Generator Box */}
      <div className="rounded-paper border border-line bg-surface p-6 shadow-sm flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold text-ink">{t('generateTitle')}</h2>
          <p className="mt-1 text-sm text-ink-2">{t('generateDescription')}</p>
        </div>

        {error && <InlineNotice tone="err">{error}</InlineNotice>}
        {success && <InlineNotice tone="ok">{success}</InlineNotice>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tests.length > 0 && (
            <div className="sm:col-span-2">
              <FormField label={t('selectTest')}>
                {(fieldProps) => (
                  <Select value={selectedTestId} onValueChange={handleTestSelect}>
                    <SelectTrigger {...fieldProps}>
                      <SelectValue placeholder={t('selectTestPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">{t('selectTestPlaceholder')}</SelectItem>
                      {tests.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.title} ({test.question_count} soru)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>
          )}

          <FormField label={t('questionCount')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                min={1}
                max={200}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
              />
            )}
          </FormField>

          <FormField label={t('optionsCount')}>
            {(fieldProps) => (
              <Select
                value={String(optionsCount)}
                onValueChange={(val) => setOptionsCount(val === '5' ? 5 : 4)}
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">{t('options4')}</SelectItem>
                  <SelectItem value="5">{t('options5')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField label={t('studentNumberDigits')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                min={1}
                max={10}
                value={digits}
                onChange={(e) => setDigits(Number(e.target.value))}
              />
            )}
          </FormField>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-line">
          <Button onClick={handleGenerate} loading={pending} size="md">
            <Icon name="file-text" size={16} />
            <span>{pending ? t('downloading') : t('downloadPdf')}</span>
          </Button>
        </div>
      </div>

      {/* Workflow Explanatory Steps */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-semibold text-ink">{t('workflowTitle')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-paper border border-line bg-surface p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-medium text-sm text-ink">
              <Icon name="file-text" size={16} />
              <span>{t('step1Title')}</span>
            </div>
            <p className="text-xs text-ink-2">{t('step1Desc')}</p>
          </div>

          <div className="rounded-paper border border-line bg-surface p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-medium text-sm text-ink">
              <Icon name="pencil-simple" size={16} />
              <span>{t('step2Title')}</span>
            </div>
            <p className="text-xs text-ink-2">{t('step2Desc')}</p>
          </div>

          <div className="rounded-paper border border-line bg-surface p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-medium text-sm text-ink">
              <Icon name="scan-smiley" size={16} />
              <span>{t('step3Title')}</span>
            </div>
            <p className="text-xs text-ink-2">{t('step3Desc')}</p>
          </div>

          <div className="rounded-paper border border-line bg-surface p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-medium text-sm text-ink">
              <Icon name="chart-bar" size={16} />
              <span>{t('step4Title')}</span>
            </div>
            <p className="text-xs text-ink-2">{t('step4Desc')}</p>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="secondary" asChild>
            <Link href="/classes">
              <Icon name="student" size={16} />
              <span>{t('linkResultsAction')}</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

