'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { AI_CREDIT_COSTS, type StoredQualityCheck } from '@testcim/shared';

import { aiErrorText } from './ai-error';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  generateDistractors,
  imageToText,
  qualityCheck,
} from '@/features/ai/question-actions.server';

export interface QuestionAiActionsProps {
  readonly questionId: string;
  readonly kind: 'image' | 'rich';
  readonly questionType: string;
  readonly hasText: boolean;
  readonly initialQuality: StoredQualityCheck | null;
}

type ActionName = 'imageToText' | 'distractors' | 'qualityCheck';

export function QuestionAiActions({
  questionId,
  kind,
  questionType,
  hasText,
  initialQuality,
}: QuestionAiActionsProps) {
  const t = useTranslations('ai');
  const [running, setRunning] = useState<ActionName | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string; tray: boolean } | null>(
    null,
  );
  const [quality, setQuality] = useState<StoredQualityCheck | null>(initialQuality);
  const [, startTransition] = useTransition();

  function run(name: ActionName) {
    setNotice(null);
    setRunning(name);
    startTransition(async () => {
      try {
        if (name === 'qualityCheck') {
          const result = await qualityCheck({ questionId });
          if (!result.ok) {
            setNotice({ tone: 'err', text: aiErrorText(t, result.reason), tray: false });
            return;
          }
          setQuality(result.check);
          return;
        }

        const result =
          name === 'imageToText'
            ? await imageToText({ questionId })
            : await generateDistractors({ questionId, count: 2 });

        if (!result.ok) {
          setNotice({ tone: 'err', text: aiErrorText(t, result.reason), tray: false });
          return;
        }
        setNotice({
          tone: 'ok',
          text: t('actions.draftCreated', { credits: result.creditsCharged }),
          tray: true,
        });
      } finally {
        setRunning(null);
      }
    });
  }

  const canImageToText = kind === 'image';
  const canDistractors = questionType === 'mcq' && hasText;
  const canQuality = hasText;

  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-xs text-ink-2">{t('actions.intro')}</p>

      <ActionRow
        label={t('actions.imageToText')}
        help={t('actions.imageToTextHelp')}
        cost={t('actions.cost', { credits: AI_CREDIT_COSTS.image_to_text })}
        busyLabel={t('actions.running')}
        running={running === 'imageToText'}
        disabled={!canImageToText || running !== null}
        onRun={() => run('imageToText')}
      />
      <ActionRow
        label={t('actions.distractors')}
        help={t('actions.distractorsHelp')}
        cost={t('actions.cost', { credits: AI_CREDIT_COSTS.generate_distractors })}
        busyLabel={t('actions.running')}
        running={running === 'distractors'}
        disabled={!canDistractors || running !== null}
        onRun={() => run('distractors')}
      />
      <ActionRow
        label={t('actions.qualityCheck')}
        help={t('actions.qualityCheckHelp')}
        cost={t('actions.cost', { credits: AI_CREDIT_COSTS.quality_check })}
        busyLabel={t('actions.running')}
        running={running === 'qualityCheck'}
        disabled={!canQuality || running !== null}
        onRun={() => run('qualityCheck')}
      />

      {!hasText && kind === 'image' && (
        <p className="text-xs text-ink-3">{t('errors.needs_text')}</p>
      )}

      {notice && (
        <InlineNotice tone={notice.tone}>
          <span>{notice.text}</span>{' '}
          {notice.tray && (
            <Link href="/bank/review" className="font-medium underline">
              {t('actions.openTray')}
            </Link>
          )}
        </InlineNotice>
      )}

      {quality && (
        <div className="flex flex-col gap-1.5 text-sm">
          <h3 className="text-xs font-medium text-ink-2">{t('actions.qualityTitle')}</h3>
          {quality.issues.length === 0 ? (
            <p className="text-ink-2">{t('actions.qualityClean')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {quality.issues.map((issue, index) => (
                <li key={`${issue.kind}-${index}`} className="flex items-start gap-2">
                  <Badge
                    tone={
                      issue.severity === 'error'
                        ? 'err'
                        : issue.severity === 'warn'
                          ? 'warn'
                          : 'neutral'
                    }
                  >
                    {t(`qualityKinds.${issue.kind}`)}
                  </Badge>
                  <span className="text-ink">{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink-3">
            {t('tray.qualityDifficulty', { value: quality.difficultyEstimate })}
          </p>
        </div>
      )}
    </div>
  );
}

function ActionRow({
  label,
  help,
  cost,
  busyLabel,
  running,
  disabled,
  onRun,
}: {
  readonly label: string;
  readonly help: string;
  readonly cost: string;
  readonly busyLabel: string;
  readonly running: boolean;
  readonly disabled: boolean;
  readonly onRun: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs text-ink-3">{cost}</span>
      </div>
      <p className="text-xs text-ink-2">{help}</p>
      <Button size="sm" variant="secondary" loading={running} disabled={disabled} onClick={onRun}>
        {running ? busyLabel : label}
      </Button>
    </div>
  );
}
