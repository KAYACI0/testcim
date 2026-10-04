'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useStore } from 'zustand';

import type { EditorStore } from '@/features/editor/store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CollaborationPanel } from '@/features/collaboration/components/collaboration-panel';
import { PublishExamDialog } from '@/features/online-exam/publish-dialog';

const SAVE_STATUS_KEY = {
  saved: 'saved',
  saving: 'saving',
  offline: 'offline',
  error: 'error',
} as const;

export function EditorTopBar({
  store,
  approvalStatus,
}: {
  readonly store: EditorStore;
  readonly approvalStatus: 'draft' | 'in_review' | 'approved';
}) {
  const title = useStore(store, (s) => s.title);
  const testId = useStore(store, (s) => s.testId);
  const saveStatus = useStore(store, (s) => s.saveStatus);
  const t = useTranslations('editor.topBar');
  const [draftTitle, setDraftTitle] = useState(title);
  const [collaborationOpen, setCollaborationOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Input
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={() => {
            if (draftTitle.trim() && draftTitle !== title) {
              store.getState().updateTitle(draftTitle.trim());
            } else {
              setDraftTitle(title);
            }
          }}
          aria-label={t('titleLabel')}
          className="max-w-sm font-medium"
        />
        <span className="shrink-0 text-sm text-ink-2">
          {t(`saveStatus.${SAVE_STATUS_KEY[saveStatus]}`)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setCollaborationOpen(true)}>
          {t('collaboration')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const el = document.querySelector('.min-h-\\[1123px\\]');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          {t('preview')}
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          {t('export')}
        </Button>
        <PublishExamDialog testId={testId} defaultTitle={title} />
      </div>
      <CollaborationPanel
        open={collaborationOpen}
        onOpenChange={setCollaborationOpen}
        testId={testId}
        approvalStatus={approvalStatus}
      />
    </div>
  );
}
