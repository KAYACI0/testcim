'use client';

import { useTranslations } from 'next-intl';
import { startTransition, useCallback, useEffect, useState } from 'react';

import type { RealtimeCaptureQuestionEvent } from '@testcim/shared';

import {
  closeCaptureSessionAction,
  createCaptureSessionAction,
  type CreateCaptureSessionResult,
} from './session.server';

import type { EditorStore } from '@/features/editor/store';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { createClient } from '@/lib/supabase/client';

export function PhoneCaptureDialog({
  open,
  onOpenChange,
  testId,
  store,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly testId: string;
  readonly store: EditorStore;
}) {
  const t = useTranslations('editor.phoneCaptureDialog');
  const [session, setSession] = useState<CreateCaptureSessionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [status, setStatus] = useState<'waiting' | 'connected'>('waiting');

  const initSession = useCallback(async () => {
    setLoading(true);
    setCapturedCount(0);
    setStatus('waiting');
    try {
      const result = await createCaptureSessionAction({ testId, deviceType: 'phone' });
      if (result.ok && result.expiresAt) {
        setSession(result);
        const diffSec = Math.max(
          0,
          Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000),
        );
        setSecondsRemaining(diffSec);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  // Initialise session when dialog opens
  useEffect(() => {
    if (!open) {
      return;
    }
    startTransition(() => {
      void initSession();
    });
  }, [open, initSession]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        if (session?.sessionId) {
          void closeCaptureSessionAction(session.sessionId);
        }
        setSession(null);
        setSecondsRemaining(null);
      }
      onOpenChange(nextOpen);
    },
    [session, onOpenChange],
  );

  // Countdown timer
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Supabase Realtime channel subscription
  useEffect(() => {
    if (!open || !testId) {
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`capture:${testId}`, {
      config: { broadcast: { self: true } },
    });

    channel.on(
      'broadcast',
      { event: 'question_captured' },
      ({ payload }: { payload: RealtimeCaptureQuestionEvent }) => {
        if (!payload || payload.testId !== testId) {
          return;
        }

        store.getState().addExternalCapturedItem({
          id: payload.itemId,
          position: store.getState().positionForNewItem(null),
          questionId: payload.questionId,
          questionRevisionId: payload.questionRevisionId,
          thumbnailUrl: payload.thumbnailUrl ?? '',
          correct: payload.answer ? { question_type: 'mcq', option_id: payload.answer } : null,
        });

        setCapturedCount((prev) => prev + 1);
        setStatus('connected');
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, testId, store]);

  const handleCopyLink = useCallback(async () => {
    if (!session?.mobileUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(session.mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  }, [session]);

  const isExpired = secondsRemaining === 0;
  const minutes = secondsRemaining !== null ? Math.floor(secondsRemaining / 60) : 0;
  const seconds = secondsRemaining !== null ? secondsRemaining % 60 : 0;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={t('title')}
        description={t('description')}
        closeLabel={t('close')}
        className="max-w-sm sm:max-w-md"
      >
        <div className="flex flex-col items-center gap-4 py-2">
          {loading ? (
            <div className="bg-surface-2 flex h-56 w-56 animate-pulse items-center justify-center rounded border border-line">
              <Icon name="device-mobile" size={32} className="text-ink-2" />
            </div>
          ) : isExpired ? (
            <div className="bg-surface-2 flex h-56 w-56 flex-col items-center justify-center gap-3 rounded border border-line p-4 text-center">
              <Icon name="clock" size={32} className="text-ink-2" />
              <p className="text-sm font-medium text-ink">{t('expired')}</p>
              <Button size="sm" variant="secondary" onClick={() => void initSession()}>
                <Icon name="arrow-clockwise" size={16} className="mr-1.5" />
                {t('recreate')}
              </Button>
            </div>
          ) : session?.qrCodeDataUrl ? (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded border border-line bg-surface p-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={session.qrCodeDataUrl}
                  alt="QR Code"
                  width={208}
                  height={208}
                  className="block h-52 w-52"
                />
              </div>
              <p className="text-xs text-ink-2">{t('expiresIn', { time: timeString })}</p>
            </div>
          ) : null}

          {/* Connection status and live count indicator */}
          {!isExpired && session && (
            <div className="bg-surface-2 flex w-full items-center justify-between rounded border border-line px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-control ${
                    status === 'connected' ? 'bg-ok' : 'animate-pulse bg-warn'
                  }`}
                />
                <span className="text-ink-2">
                  {status === 'connected' ? t('connected') : t('waiting')}
                </span>
              </div>
              {capturedCount > 0 && (
                <span className="font-medium text-ink">
                  {t('receivedCount', { count: capturedCount })}
                </span>
              )}
            </div>
          )}

          {/* Copy link option */}
          {!isExpired && session?.mobileUrl && (
            <div className="flex w-full items-center gap-2">
              <input
                type="text"
                readOnly
                value={session.mobileUrl}
                className="bg-surface-2 min-w-0 flex-1 rounded border border-line px-3 py-1.5 text-xs text-ink-2 outline-none"
              />
              <Button size="sm" variant="secondary" onClick={() => void handleCopyLink()}>
                <Icon name={copied ? 'check' : 'copy'} size={14} className="mr-1.5" />
                {copied ? t('linkCopied') : t('copyLink')}
              </Button>
            </div>
          )}

          <div className="mt-2 flex w-full justify-end">
            <Button size="sm" onClick={() => handleOpenChange(false)}>
              {t('done')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
