'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { uuidv7 } from 'uuidv7';

import {
  detectDefaultQuad,
  pHash,
  rotateRawImage,
  sha256,
  warpQuad,
  type Point,
  type Quad,
  type RawImage,
} from '@testcim/image-tools';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { InlineNotice, type NoticeTone } from '@/components/ui/inline-notice';
import {
  getMobileSignedUploadUrlAction,
  submitCaptureQuestionAction,
} from '@/features/capture/session.server';

const ANSWER_OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;
type AnswerOption = (typeof ANSWER_OPTIONS)[number];

export function MobileCaptureClient({
  token,
  testTitle,
}: {
  readonly token: string;
  readonly testTitle: string;
}) {
  const t = useTranslations('editor.mobileCapture');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'idle' | 'adjust' | 'sending'>('idle');
  const [currentRaw, setCurrentRaw] = useState<RawImage | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerOption | null>(null);
  const [feedback, setFeedback] = useState<{ tone: NoticeTone; message: string } | null>(null);
  const [capturedCount, setCapturedCount] = useState(0);

  const loadImageFromFile = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const maxDim = 2048;
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const raw: RawImage = {
        width: w,
        height: h,
        data: imgData.data,
      };

      setCurrentRaw(raw);
      setImagePreviewUrl(objectUrl);
      setQuad(detectDefaultQuad(w, h));
      setMode('adjust');
      setFeedback(null);
    };
    img.src = objectUrl;
  }, []);

  const handleRotate = useCallback(() => {
    if (!currentRaw) {
      return;
    }
    const rotated = rotateRawImage(currentRaw, 90);
    setCurrentRaw(rotated);

    const canvas = document.createElement('canvas');
    canvas.width = rotated.width;
    canvas.height = rotated.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(rotated.data), rotated.width, rotated.height),
        0,
        0,
      );
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
    }

    setQuad(detectDefaultQuad(rotated.width, rotated.height));
  }, [currentRaw, imagePreviewUrl]);

  const handleResetCrop = useCallback(() => {
    if (!currentRaw) {
      return;
    }
    setQuad(detectDefaultQuad(currentRaw.width, currentRaw.height));
  }, [currentRaw]);

  // Touch / mouse handling for quad handles
  const handlePointerDown = (index: number) => (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setActiveHandle(index);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (activeHandle === null || !quad || !currentRaw || !imageContainerRef.current) {
      return;
    }
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clientX = event.clientX;
    const clientY = event.clientY;

    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const clampedY = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const scaleX = currentRaw.width / rect.width;
    const scaleY = currentRaw.height / rect.height;

    const newPoint: Point = {
      x: Math.round(clampedX * scaleX),
      y: Math.round(clampedY * scaleY),
    };

    setQuad((prev) => {
      if (!prev) return null;
      const next: [Point, Point, Point, Point] = [prev[0], prev[1], prev[2], prev[3]];
      next[activeHandle] = newPoint;
      return next;
    });
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (activeHandle !== null) {
      try {
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      setActiveHandle(null);
    }
  };

  const handleSubmit = async () => {
    if (!currentRaw || !quad) {
      return;
    }

    setMode('sending');
    setFeedback(null);

    try {
      // Calculate target width and height based on quad edge lengths
      const dist = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const topW = dist(quad[0], quad[1]);
      const bottomW = dist(quad[3], quad[2]);
      const leftH = dist(quad[0], quad[3]);
      const rightH = dist(quad[1], quad[2]);

      const targetW = Math.max(300, Math.min(2400, Math.round(Math.max(topW, bottomW))));
      const targetH = Math.max(150, Math.min(2400, Math.round(Math.max(leftH, rightH))));

      // Perform perspective warp
      const warped = warpQuad(currentRaw, quad, targetW, targetH);

      // Render warped RawImage to blob
      const offscreen = document.createElement('canvas');
      offscreen.width = targetW;
      offscreen.height = targetH;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) {
        throw new Error('Canvas context unavailable');
      }

      offCtx.putImageData(
        new ImageData(new Uint8ClampedArray(warped.data), targetW, targetH),
        0,
        0,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        offscreen.toBlob(
          (b) => {
            if (b) {
              resolve(b);
            } else {
              reject(new Error('toBlob failed'));
            }
          },
          'image/jpeg',
          0.88,
        );
      });

      // Compute hashes
      const arrayBuffer = await blob.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      const fileSha256 = await sha256(fileBytes);
      const filePhash = pHash(warped);

      // Get signed upload URL
      const signedUploadRes = await getMobileSignedUploadUrlAction(token, 'jpg');
      if (!signedUploadRes.ok || !signedUploadRes.signedUrl || !signedUploadRes.path) {
        throw new Error(signedUploadRes.reason ?? 'Upload url error');
      }

      // Upload directly to storage
      const uploadHttpRes = await fetch(signedUploadRes.signedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      if (!uploadHttpRes.ok) {
        throw new Error(`Upload failed with status ${uploadHttpRes.status}`);
      }

      // Submit captured question metadata
      const submitRes = await submitCaptureQuestionAction({
        token,
        itemId: uuidv7(),
        position: '',
        path: signedUploadRes.path,
        mime: 'image/jpeg',
        bytes: blob.size,
        width: targetW,
        height: targetH,
        sha256: fileSha256,
        phash: filePhash,
        answer: selectedAnswer ?? undefined,
      });

      if (!submitRes.ok) {
        throw new Error(submitRes.reason ?? 'Submit error');
      }

      // Cleanup preview
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
      setCurrentRaw(null);
      setQuad(null);
      setSelectedAnswer(null);

      // Update count & notify
      setCapturedCount((prev) => prev + 1);
      setFeedback({ tone: 'ok', message: t('successContinuous') });
      setMode('idle');
    } catch (error) {
      setMode('adjust');
      setFeedback({
        tone: 'err',
        message: error instanceof Error ? error.message : t('networkError'),
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface px-4 py-6">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <div>
          <h1 className="text-base font-semibold text-ink">{t('title')}</h1>
          <p className="text-xs text-ink-2">{t('targetTest', { title: testTitle })}</p>
        </div>
        {capturedCount > 0 && (
          <span className="bg-surface-2 rounded px-2.5 py-1 text-xs font-medium text-ink">
            {capturedCount} soru
          </span>
        )}
      </header>

      {/* Notice */}
      {feedback && (
        <InlineNotice tone={feedback.tone} className="mb-4">
          {feedback.message}
        </InlineNotice>
      )}

      {/* Mode: IDLE (Take photo or select photo) */}
      {mode === 'idle' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                loadImageFromFile(file);
                e.target.value = '';
              }
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                loadImageFromFile(file);
                e.target.value = '';
              }
            }}
          />

          <div className="bg-surface-2 rounded-control border border-line p-6">
            <Icon name="camera" size={48} className="text-ink-2" />
          </div>

          <div className="flex w-full flex-col gap-2 pt-4">
            <Button size="md" onClick={() => cameraInputRef.current?.click()} className="w-full">
              <Icon name="camera" size={20} className="mr-2" />
              {t('takePhoto')}
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full"
            >
              <Icon name="image" size={20} className="mr-2" />
              {t('choosePhoto')}
            </Button>
          </div>
        </div>
      )}

      {/* Mode: ADJUST (Perspective correction + rotation + answer selection) */}
      {(mode === 'adjust' || mode === 'sending') && imagePreviewUrl && currentRaw && quad && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-2">{t('adjustHint')}</p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="tertiary"
                onClick={handleRotate}
                disabled={mode === 'sending'}
                title={t('rotate')}
              >
                <Icon name="arrow-clockwise" size={16} />
              </Button>
              <Button
                size="sm"
                variant="tertiary"
                onClick={handleResetCrop}
                disabled={mode === 'sending'}
                title={t('resetCrop')}
              >
                {t('resetCrop')}
              </Button>
            </div>
          </div>

          {/* Interactive Quad Preview Canvas / Overlay */}
          <div
            ref={imageContainerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="bg-surface-2 relative touch-none overflow-hidden rounded border border-line select-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="Capture Preview"
              className="pointer-events-none block w-full object-contain"
            />

            {/* SVG Quad Overlay */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${currentRaw.width} ${currentRaw.height}`}
              preserveAspectRatio="none"
            >
              <polygon
                points={`${quad[0].x},${quad[0].y} ${quad[1].x},${quad[1].y} ${quad[2].x},${quad[2].y} ${quad[3].x},${quad[3].y}`}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                className="stroke-accent text-accent/15"
              />
            </svg>

            {/* Draggable Corner Handles */}
            {([0, 1, 2, 3] as const).map((idx) => {
              const pt = quad[idx];
              const leftPct = (pt.x / currentRaw.width) * 100;
              const topPct = (pt.y / currentRaw.height) * 100;

              return (
                <div
                  key={idx}
                  onPointerDown={handlePointerDown(idx)}
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                  className="pointer-events-auto absolute -mt-4 -ml-4 flex h-8 w-8 cursor-grab items-center justify-center active:cursor-grabbing"
                >
                  <span className="block h-4 w-4 rounded-control border-2 border-accent bg-surface shadow-sm ring-2 ring-white/80" />
                </div>
              );
            })}
          </div>

          {/* Correct Answer Selection */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-xs font-medium text-ink-2">{t('correctAnswer')}</span>
            <div className="grid grid-cols-5 gap-2">
              {ANSWER_OPTIONS.map((opt) => {
                const isSelected = selectedAnswer === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={mode === 'sending'}
                    onClick={() => setSelectedAnswer(isSelected ? null : opt)}
                    className={`flex h-11 items-center justify-center rounded border text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'border-ink bg-ink text-surface'
                        : 'hover:bg-surface-2 active:bg-surface-2 border-line bg-surface text-ink'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto flex items-center gap-2 pt-4">
            <Button
              size="md"
              variant="secondary"
              disabled={mode === 'sending'}
              onClick={() => {
                if (imagePreviewUrl) {
                  URL.revokeObjectURL(imagePreviewUrl);
                }
                setImagePreviewUrl(null);
                setCurrentRaw(null);
                setMode('idle');
              }}
              className="flex-1"
            >
              {t('retake')}
            </Button>
            <Button
              size="md"
              disabled={mode === 'sending'}
              onClick={() => void handleSubmit()}
              className="flex-1"
            >
              {mode === 'sending' ? t('sending') : t('sendToTest')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
