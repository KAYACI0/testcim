'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useStore } from 'zustand';

import type { CaptureResult } from '@/features/capture/use-capture';
import type { EditorStore } from '@/features/editor/store';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Switch } from '@/components/ui/switch';
import { PhoneCaptureDialog } from '@/features/capture/phone-capture-dialog';
import { BulkAnswersPopover } from '@/features/editor/bulk-answers-popover';

export function PasteBar({
  store,
  captureFiles,
  onWriteQuestion,
  onAddGroup,
}: {
  readonly store: EditorStore;
  readonly captureFiles: (files: readonly File[]) => CaptureResult;
  readonly onWriteQuestion: () => void;
  readonly onAddGroup: () => void;
}) {
  const items = useStore(store, (s) => s.items);
  const captureMode = useStore(store, (s) => s.captureMode);
  const testId = useStore(store, (s) => s.testId);
  const t = useTranslations('editor.pasteBar');
  const tRich = useTranslations('richEditor');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

  const readyCount = items.filter((item) => item.status === 'ready').length;
  const lastAdded = [...items].reverse().find((item) => item.status !== 'error');
  const lastAddedIndex = lastAdded ? items.findIndex((item) => item.id === lastAdded.id) + 1 : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-sm text-ink-2">
        {lastAddedIndex
          ? t('statusWithLastAdded', { count: readyCount, number: lastAddedIndex })
          : t('status', { count: readyCount })}
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <Switch
            checked={captureMode}
            onCheckedChange={(on) => store.getState().setCaptureMode(on)}
          />
          {t('captureMode')}
        </label>

        <BulkAnswersPopover store={store} />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              captureFiles(Array.from(event.target.files));
              event.target.value = '';
            }
          }}
        />
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          {t('chooseFile')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setPhoneDialogOpen(true)}>
          <Icon name="device-mobile" size={16} className="mr-1.5" />
          {t('phoneCapture')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onWriteQuestion}>
          {tRich('newQuestion')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onAddGroup}>
          {tRich('group.addGroup')}
        </Button>
      </div>

      <PhoneCaptureDialog
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
        testId={testId}
        store={store}
      />
    </div>
  );
}

export function QuotaNotice({ rejectedByQuota }: { readonly rejectedByQuota: number }) {
  const t = useTranslations('editor.pasteBar');
  if (rejectedByQuota <= 0) {
    return null;
  }
  return (
    <InlineNotice tone="warn" className="mx-4 mt-2">
      {t('quotaExceeded', { count: rejectedByQuota })}
    </InlineNotice>
  );
}
