'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { publishExam } from './actions.server';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PublishExamDialog({
  testId,
  defaultTitle,
}: {
  readonly testId: string;
  readonly defaultTitle: string;
}) {
  const t = useTranslations('exams.publish');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [mode, setMode] = useState<'async' | 'live'>('async');
  const [access, setAccess] = useState<'link' | 'code' | 'roster'>('link');
  const [durationMin, setDurationMin] = useState('');
  const [showResults, setShowResults] = useState<'never' | 'after_submit' | 'after_close'>(
    'after_close',
  );
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; slug?: string; reason?: string } | null>(
    null,
  );

  async function handlePublish() {
    setPending(true);
    const res = await publishExam({
      testId,
      title,
      mode,
      access,
      durationSec: durationMin ? Number(durationMin) * 60 : undefined,
      shuffleQuestions: true,
      shuffleOptions: true,
      showResults,
      showAnswers: false,
      requiredFields: { displayName: true, studentNo: access !== 'link', classLabel: false },
    });
    setPending(false);
    setResult(res.ok ? { ok: true, slug: res.slug } : { ok: false, reason: res.reason });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t('trigger')}</Button>
      </DialogTrigger>
      <DialogContent title={t('title')} closeLabel={t('close')}>
        {result?.ok ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">{t('publishedMessage')}</p>
            <Input
              readOnly
              value={`${window.location.origin}/s/${result.slug}`}
              className="text-sm"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
            />

            <Select value={mode} onValueChange={(v) => setMode(v as 'async' | 'live')}>
              <SelectTrigger>
                <SelectValue placeholder={t('modeLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="async">{t('modeAsync')}</SelectItem>
                <SelectItem value="live">{t('modeLive')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={access}
              onValueChange={(v) => setAccess(v as 'link' | 'code' | 'roster')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('accessLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">{t('accessLink')}</SelectItem>
                <SelectItem value="code">{t('accessCode')}</SelectItem>
                <SelectItem value="roster">{t('accessRoster')}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              min={1}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder={t('durationPlaceholder')}
            />

            <Select
              value={showResults}
              onValueChange={(v) => setShowResults(v as typeof showResults)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('showResultsLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{t('showResultsNever')}</SelectItem>
                <SelectItem value="after_submit">{t('showResultsAfterSubmit')}</SelectItem>
                <SelectItem value="after_close">{t('showResultsAfterClose')}</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 text-sm text-ink-2">
              <Checkbox disabled checked />
              {t('shuffleNote')}
            </label>

            {result && !result.ok && (
              <p className="text-sm text-err">
                {t('publishFailed', { reason: result.reason ?? '' })}
              </p>
            )}

            <Button disabled={pending || !title.trim()} onClick={() => void handlePublish()}>
              {pending ? t('publishing') : t('publishButton')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
