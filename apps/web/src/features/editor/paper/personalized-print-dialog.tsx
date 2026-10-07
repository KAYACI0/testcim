'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { usePersonalizedPrint } from './use-personalized-print';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listClasses, type ClassRow } from '@/features/classes/actions.server';

export function PersonalizedPrintDialog() {
  const t = useTranslations('editor.personalizedPrint');
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [classId, setClassId] = useState<string>('');
  const [watermark, setWatermark] = useState(true);
  const { busy, progress, outcome, download } = usePersonalizedPrint();

  useEffect(() => {
    if (!open || classes) return;
    void listClasses().then((rows) => {
      const active = rows.filter((row) => !row.archived);
      setClasses(active);
      const first = active[0];
      if (first) setClassId(first.id);
    });
  }, [open, classes]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          {t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent title={t('title')} description={t('description')} closeLabel={t('close')}>
        <div className="flex flex-col gap-4">
          {outcome === 'empty' && <InlineNotice tone="warn">{t('empty')}</InlineNotice>}
          {outcome === 'failed' && <InlineNotice tone="err">{t('error')}</InlineNotice>}

          {classes && classes.length === 0 ? (
            <p className="text-sm text-ink-2">{t('noClasses')}</p>
          ) : (
            <>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('classPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(classes ?? []).map((klass) => (
                    <SelectItem key={klass.id} value={klass.id}>
                      {klass.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="flex items-center gap-2 text-sm text-ink">
                <Checkbox checked={watermark} onCheckedChange={(v) => setWatermark(Boolean(v))} />
                {t('watermarkLabel')}
              </label>
            </>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('close')}
            </Button>
            <Button loading={busy} disabled={!classId} onClick={() => download(classId, watermark)}>
              {busy && progress
                ? t('progress', { done: progress.done, total: progress.total })
                : t('downloadAction')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
