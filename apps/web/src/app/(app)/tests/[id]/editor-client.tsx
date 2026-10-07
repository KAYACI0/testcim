'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

// The rich question editor (TipTap, KaTeX) and the passage panel are only needed once the
// teacher opens them, so they load on demand instead of with the editor page.
const QuestionEditorPanel = dynamic(() =>
  import('@/features/rich-editor/question-editor/panel').then((m) => m.QuestionEditorPanel),
);
const GroupPanel = dynamic(() =>
  import('@/features/rich-editor/question-editor/group-panel').then((m) => m.GroupPanel),
);

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
  const [inspectorTab, setInspectorTab] = useState<'page' | 'booklets' | 'answers' | 'output'>(
    'page',
  );

  const [store] = useState(() =>
    createEditorStore(
      {
        testId: data.testId,
        title: data.title,
        baseRevision: data.baseRevision,
        settings: data.settings,
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
  const [richEditorLoaded, setRichEditorLoaded] = useState(false);
  const [groupPanelLoaded, setGroupPanelLoaded] = useState(false);

  // Mounting the lazily loaded panel and opening it happen together, so it appears open.
  const openRichEditor = useCallback(() => {
    setRichEditorLoaded(true);
    setRichEditorOpen(true);
  }, []);
  const openGroupPanel = useCallback(() => {
    setGroupPanelLoaded(true);
    setGroupPanelOpen(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        openRichEditor();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openRichEditor]);

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
          <QuestionStrip
            store={store}
            onCaptureFiles={handleCaptureFiles}
            onWriteQuestion={openRichEditor}
          />
        </div>
        <div className="min-w-0 flex-1">
          <PaperPreview store={store} onEditTemplate={() => setInspectorTab('page')} />
        </div>
        <div className="w-80 shrink-0 border-l border-line">
          <Inspector store={store} activeTab={inspectorTab} onTabChange={setInspectorTab} />
        </div>
      </div>
      <QuotaNotice rejectedByQuota={rejectedByQuota} />
      <PasteBar
        store={store}
        captureFiles={handleCaptureFiles}
        onWriteQuestion={openRichEditor}
        onAddGroup={openGroupPanel}
      />
      {richEditorLoaded && (
        <QuestionEditorPanel
          open={richEditorOpen}
          onOpenChange={setRichEditorOpen}
          store={store}
          testId={data.testId}
          workspaceId={workspaceId}
        />
      )}
      {groupPanelLoaded && (
        <GroupPanel open={groupPanelOpen} onOpenChange={setGroupPanelOpen} testId={data.testId} />
      )}
    </div>
  );
}
