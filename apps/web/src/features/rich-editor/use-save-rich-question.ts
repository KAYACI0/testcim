'use client';

import { uuidv7 } from 'uuidv7';

import { sha256 } from '@testcim/image-tools';

import { saveRichQuestion } from './actions.server';
import { renderElementToPng } from './render/render-question';

import type { RichQuestionDraft } from './types';
import type { EditorStore } from '../editor/store';

import { createClient } from '@/lib/supabase/client';

/**
 * The DPI a rich question's render asset is saved at: docs/prompts/07's
 * acceptance criteria requires no blur at 300 DPI print, and unlike a
 * pasted screenshot (re-encoded per export quality by the layout engine's
 * existing image pipeline) this PNG *is* the permanent asset, regenerated
 * only when the teacher reopens and re-saves the question.
 */
const SAVE_DPI = 300;
const COLUMN_WIDTH_MM = 170;

export function useSaveRichQuestion({
  store,
  testId,
  workspaceId,
}: {
  readonly store: EditorStore;
  readonly testId: string;
  readonly workspaceId: string;
}) {
  async function save(
    draft: RichQuestionDraft,
    previewElement: HTMLElement,
  ): Promise<{ ok: boolean; reason?: string }> {
    const itemId = uuidv7();
    const position = store.getState().positionForNewItem(null);

    const pngBlob = await renderElementToPng(previewElement, {
      widthMm: COLUMN_WIDTH_MM,
      dpi: SAVE_DPI,
    });
    const thumbnailUrl = URL.createObjectURL(pngBlob);
    store.getState().addCaptureBatch([{ id: itemId, thumbnailUrl }]);

    const bytes = new Uint8Array(await pngBlob.arrayBuffer());
    const hash = await sha256(bytes);
    const dimensions = await readPngDimensions(pngBlob);
    const path = `${workspaceId}/${new Date().getFullYear()}/${itemId}.png`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(path, pngBlob, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      store.getState().markCaptureError(itemId, uploadError.message);
      return { ok: false, reason: uploadError.message };
    }

    const result = await saveRichQuestion({
      testId,
      itemId,
      position,
      render: { path, mime: 'image/png', bytes: bytes.byteLength, ...dimensions, sha256: hash },
      questionType: draft.questionType,
      stemRich: draft.stemRich,
      options: draft.options.map(({ key: _key, ...rest }) => rest),
      correct: draft.correct as never,
      points: draft.points,
      explanationRich: draft.explanationRich,
    });

    if (!result.ok) {
      store.getState().markCaptureError(itemId, result.reason);
      return { ok: false, reason: result.reason };
    }

    store.getState().confirmCaptured(itemId, {
      questionId: result.questionId,
      questionRevisionId: result.questionRevisionId,
    });
    return { ok: true };
  }

  return { save };
}

function readPngDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('png_dimension_read_failed'));
    image.src = URL.createObjectURL(blob);
  });
}
