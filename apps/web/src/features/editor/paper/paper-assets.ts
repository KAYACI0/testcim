'use client';

import { useEffect, useState } from 'react';

import {
  createTextMeasure,
  fetchPdfFontBytes,
  type PdfFontBytes,
  type TextMeasure,
} from '@testcim/pdf-fonts';
import type { PdfImageInput } from '@testcim/renderers/paint';

import type { ImageSize } from './paper-layout';

export interface PaperFonts {
  readonly bytes: PdfFontBytes;
  readonly measure: TextMeasure;
}

let fontsPromise: Promise<PaperFonts> | undefined;

/** Loads the paper's font files once per page load (docs/adr/0011), shared by layout and PDF. */
export function loadPaperFonts(): Promise<PaperFonts> {
  fontsPromise ??= fetchPdfFontBytes()
    .then((bytes) => ({ bytes, measure: createTextMeasure(bytes) }))
    .catch((error: unknown) => {
      fontsPromise = undefined;
      throw error;
    });
  return fontsPromise;
}

export function usePaperFonts(): { readonly fonts: PaperFonts | null; readonly failed: boolean } {
  const [fonts, setFonts] = useState<PaperFonts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPaperFonts().then(
      (loaded) => {
        if (!cancelled) setFonts(loaded);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { fonts, failed };
}

const sizeCache = new Map<string, Promise<ImageSize | null>>();

/** The natural size of an image, which decides how tall its question is on the paper. */
export function loadImageSize(url: string): Promise<ImageSize | null> {
  let pending = sizeCache.get(url);
  if (!pending) {
    pending = new Promise<ImageSize | null>((resolve) => {
      const image = new Image();
      image.onload = () => {
        resolve(
          image.naturalWidth > 0 && image.naturalHeight > 0
            ? { width: image.naturalWidth, height: image.naturalHeight }
            : null,
        );
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });
    sizeCache.set(url, pending);
  }
  return pending;
}

/** Sizes for the given image URLs as they arrive; the paper re-lays out when new ones land. */
export function useImageSizes(urls: readonly string[]): ReadonlyMap<string, ImageSize> {
  const [sizes, setSizes] = useState<ReadonlyMap<string, ImageSize>>(new Map());
  const key = urls.join('\n');

  useEffect(() => {
    let cancelled = false;
    for (const url of key ? key.split('\n') : []) {
      void loadImageSize(url).then((size) => {
        if (cancelled || !size) return;
        setSizes((previous) => {
          const known = previous.get(url);
          if (known?.width === size.width && known.height === size.height) return previous;
          return new Map(previous).set(url, size);
        });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  return sizes;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

/**
 * Fetches a question image at its original resolution for the PDF. PNG and JPEG are
 * embedded as they are; any other format is decoded and re-encoded losslessly as PNG.
 */
export async function fetchPdfImage(url: string): Promise<PdfImageInput> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`paper_image_failed_${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return { bytes, format: 'png' };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { bytes, format: 'jpeg' };

  const bitmap = await createImageBitmap(new Blob([bytes]));
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!png) {
    throw new Error('paper_image_encode_failed');
  }
  return { bytes: new Uint8Array(await png.arrayBuffer()), format: 'png' };
}
