'use client';

import { useEffect, useMemo } from 'react';
import { uuidv7 } from 'uuidv7';

import { registerCapturedQuestion } from './actions.server';
import { findDuplicate } from './duplicate';
import { createCaptureProcessor } from './queue/processor';
import { runEncode } from './worker/client';

import type { EditorStore } from '../editor/store';

import { useEntitlement } from '@/features/workspace/workspace-context';
import { createClient } from '@/lib/supabase/client';

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export interface CaptureResult {
  readonly acceptedCount: number;
  readonly rejectedByQuota: number;
}

export function useCapture({
  store,
  testId,
  workspaceId,
  captureModeEnabled,
}: {
  readonly store: EditorStore;
  readonly testId: string;
  readonly workspaceId: string;
  readonly captureModeEnabled: boolean;
}) {
  const questionsPerTest = useEntitlement('questions_per_test');

  const processor = useMemo(() => {
    const supabase = createClient();
    return createCaptureProcessor({
      encode: (blob, options) => runEncode(blob, options),
      upload: async (path, blob, mime) => {
        const { error } = await supabase.storage
          .from('assets')
          .upload(path, blob, { contentType: mime, upsert: false });
        if (error) {
          throw error;
        }
      },
      registerQuestion: (input) => registerCapturedQuestion(input),
      onEncoded: (id, { thumbnailUrl, sha256, phash }) => {
        const readyItems = store
          .getState()
          .items.filter((item) => item.status === 'ready')
          .map((item) => ({ id: item.id, sha256: item.sha256, phash: item.phash }));
        const duplicateOfItemId = findDuplicate(readyItems, sha256, phash);

        store.getState().updatePipeline(id, { thumbnailUrl, sha256, phash, duplicateOfItemId });
      },
      onSuccess: (id, result) => store.getState().confirmCaptured(id, result),
      onError: (id, message) => store.getState().markCaptureError(id, message),
    });
  }, [store]);

  function captureFiles(files: readonly File[]): CaptureResult {
    const accepted = files.filter((file) => ACCEPTED_MIME.includes(file.type));
    if (accepted.length === 0) {
      return { acceptedCount: 0, rejectedByQuota: 0 };
    }

    const currentCount = store.getState().items.length;
    const remainingSlots =
      questionsPerTest < 0 ? accepted.length : Math.max(0, questionsPerTest - currentCount);
    const toCapture = accepted.slice(0, remainingSlots);
    const rejectedByQuota = accepted.length - toCapture.length;

    const placeholders = toCapture.map((file) => ({
      id: uuidv7(),
      file,
      thumbnailUrl: URL.createObjectURL(file),
    }));

    store
      .getState()
      .addCaptureBatch(placeholders.map(({ id, thumbnailUrl }) => ({ id, thumbnailUrl })));

    if (captureModeEnabled) {
      const lastId = placeholders.at(-1)?.id;
      if (lastId) {
        store.getState().select(lastId);
      }
    }

    for (const placeholder of placeholders) {
      const position =
        store.getState().items.find((item) => item.id === placeholder.id)?.position ?? '';
      void processor.enqueue({
        id: placeholder.id,
        testId,
        workspaceId,
        blob: placeholder.file,
        position,
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt: Date.now(),
      });
    }

    return { acceptedCount: toCapture.length, rejectedByQuota };
  }

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        return;
      }

      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const files: File[] = [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        captureFiles(files);
      }
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- captureFiles closes over store/processor, both stable for the component's lifetime
  }, []);

  return { captureFiles };
}
