'use client';

import { useState } from 'react';
import { Upload as TusUpload } from 'tus-js-client';

import { beginSourceDocumentUpload, finalizeSourceDocument } from './actions.server';
import { ACCEPTED_SOURCE_DOCUMENT_MIME, type AcceptedSourceDocumentMime } from './limits';

import { clientEnv } from '@/lib/env.client';
import { createClient } from '@/lib/supabase/client';

/**
 * Supabase Storage's TUS endpoint wants 6 MB chunks (its documented resumable
 * upload guide) — anything else still works but performs worse.
 */
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export type SourceDocumentUploadResult =
  | { readonly ok: true; readonly sourceDocumentId: string; readonly pageCount: number | null }
  | { readonly ok: false; readonly reason: string };

export interface SourceDocumentUploadState {
  readonly status: 'idle' | 'uploading' | 'validating' | 'done' | 'error';
  readonly progress: number;
  readonly reason?: string;
}

function isAcceptedMime(mime: string): mime is AcceptedSourceDocumentMime {
  return (ACCEPTED_SOURCE_DOCUMENT_MIME as readonly string[]).includes(mime);
}

/**
 * Uploads a PDF/image straight to Storage from the browser (docs/02 §2: the
 * file never passes through our server), then asks the server to validate
 * and register it. Files under the TUS threshold go through a single
 * `storage.upload` call; larger ones resume over TUS so a dropped
 * connection does not restart a 50 MB upload from zero
 * (docs/adr/0003 §1).
 */
export function useSourceDocumentUpload(testId: string) {
  const [state, setState] = useState<SourceDocumentUploadState>({
    status: 'idle',
    progress: 0,
  });

  async function upload(file: File): Promise<SourceDocumentUploadResult> {
    if (!isAcceptedMime(file.type)) {
      const result: SourceDocumentUploadResult = { ok: false, reason: 'unsupported_type' };
      setState({ status: 'error', progress: 0, reason: result.reason });
      return result;
    }

    setState({ status: 'uploading', progress: 0 });

    const begin = await beginSourceDocumentUpload({
      testId,
      fileName: file.name,
      mime: file.type,
      bytes: file.size,
    });

    if (!begin.ok) {
      setState({ status: 'error', progress: 0, reason: begin.reason });
      return begin;
    }

    try {
      if (begin.useTus) {
        await uploadWithTus(begin.path, file, (progress) =>
          setState({ status: 'uploading', progress }),
        );
      } else {
        await uploadDirect(begin.path, file);
        setState({ status: 'uploading', progress: 1 });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'upload_failed';
      setState({ status: 'error', progress: 0, reason });
      return { ok: false, reason };
    }

    setState({ status: 'validating', progress: 1 });

    const finalized = await finalizeSourceDocument({
      testId,
      path: begin.path,
      name: file.name,
      mime: file.type,
      bytes: file.size,
    });

    if (!finalized.ok) {
      setState({ status: 'error', progress: 1, reason: finalized.reason });
      return finalized;
    }

    setState({ status: 'done', progress: 1 });
    return finalized;
  }

  return { upload, state };
}

async function uploadDirect(path: string, file: File): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from('assets')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    throw error;
  }
}

async function uploadWithTus(
  path: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('not_authenticated');
  }

  await new Promise<void>((resolve, reject) => {
    const tusUpload = new TusUpload(file, {
      endpoint: `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: TUS_CHUNK_SIZE,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'false',
      },
      metadata: {
        bucketName: 'assets',
        objectName: path,
        contentType: file.type,
      },
      onError: reject,
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress(bytesTotal > 0 ? bytesUploaded / bytesTotal : 0);
      },
      onSuccess: () => resolve(),
    });

    void tusUpload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        tusUpload.resumeFromPreviousUpload(previousUploads[0]!);
      }
      tusUpload.start();
    });
  });
}
