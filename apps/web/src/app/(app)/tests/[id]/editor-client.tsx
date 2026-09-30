'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';

import { EditorTopBar } from './editor-top-bar';
import { Inspector } from './inspector';
import { PaperPreview } from './paper-preview';
import { PasteBar, QuotaNotice } from './paste-bar';
import { QuestionStrip } from './question-strip';

import type { EditorItem } from '@/features/editor/types';

import { useCapture } from '@/features/capture/use-capture';
import { applyOpsAction, type EditorData } from '@/features/editor/actions.server';
import { createEditorStore } from '@/features/editor/store';
import { useEditorKeyboard } from '@/features/editor/use-editor-keyboard';
import { GroupPanel } from '@/features/rich-editor/question-editor/group-panel';
import { QuestionEditorPanel } from '@/features/rich-editor/question-editor/panel';

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}

function toEditorItems(data: EditorData): EditorItem[] {
  return data.items.map((item) => ({
    id: item.id,
    position: item.position,
    status: 'ready',
    questionId: item.questionId,
    questionRevisionId: item.questionRevisionId,
    correct: item.correct as EditorItem['correct'],
    points: item.points,
    thumbnailUrl: item.thumbnailUrl,
    sha256: null,
    phash: null,
    duplicateOfItemId: null,
    errorMessage: null,
  }));
}

export function EditorClient({
  data,
  workspaceId,
}: {
  readonly data: EditorData;
  readonly workspaceId: string;
}) {
  const [store] = useState(() =>
    createEditorStore(
      {
        testId: data.testId,
        title: data.title,
        baseRevision: data.baseRevision,
        items: toEditorItems(data),
      },
      { applyOps: applyOpsAction },
    ),
  );

  const captureMode = useStore(store, (s) => s.captureMode);
  const { captureFiles } = useCapture({
    store,
    testId: data.testId,
    workspaceId,
    captureModeEnabled: captureMode,
  });
  useEditorKeyboard(store);

  const [rejectedByQuota, setRejectedByQuota] = useState(0);
  const [richEditorOpen, setRichEditorOpen] = useState(false);
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        setRichEditorOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCaptureFiles = useMemo(
    () => (files: readonly File[]) => {
      const result = captureFiles(files);
      setRejectedByQuota(result.rejectedByQuota);
      return result;
    },
    [captureFiles],
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <EditorTopBar store={store} approvalStatus={data.approvalStatus} />
      <div className="flex min-h-0 flex-1">
        <div className="w-80 shrink-0 border-r border-line">
          <QuestionStrip store={store} />
        </div>
        <div className="min-w-0 flex-1">
          <PaperPreview store={store} />
        </div>
        <div className="w-72 shrink-0 border-l border-line">
          <Inspector store={store} />
        </div>
      </div>
      <QuotaNotice rejectedByQuota={rejectedByQuota} />
      <PasteBar
        store={store}
        captureFiles={handleCaptureFiles}
        onWriteQuestion={() => setRichEditorOpen(true)}
        onAddGroup={() => setGroupPanelOpen(true)}
      />
      <QuestionEditorPanel
        open={richEditorOpen}
        onOpenChange={setRichEditorOpen}
        store={store}
        testId={data.testId}
        workspaceId={workspaceId}
      />
      <GroupPanel open={groupPanelOpen} onOpenChange={setGroupPanelOpen} testId={data.testId} />
    </div>
  );
}
