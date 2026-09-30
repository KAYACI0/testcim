'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';

import type { PublicExamInfo } from '@/features/online-exam/anon.server';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioItem } from '@/components/ui/radio';
import { Textarea } from '@/components/ui/textarea';

interface StudentQuestion {
  readonly itemId: string;
  readonly kind: 'image' | 'rich';
  readonly questionType: string;
  readonly stemText: string | null;
  readonly stemImageUrl: string | null;
  readonly options: readonly {
    readonly id: string;
    readonly text: string | null;
    readonly imageUrl: string | null;
  }[];
  readonly points: number;
  readonly answer: unknown;
  readonly blankCount: number | null;
}

type Phase = 'loading' | 'join' | 'taking' | 'result' | 'error';

interface ApiResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly [key: string]: unknown;
}

async function readJson(res: Response): Promise<ApiResult> {
  try {
    return (await res.json()) as ApiResult;
  } catch {
    return { ok: false, reason: 'invalid_response' };
  }
}

export function ExamClient({
  slug,
  exam,
}: {
  readonly slug: string;
  readonly exam: PublicExamInfo;
}) {
  const t = useTranslations('onlineExam');
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [totalSec, setTotalSec] = useState<number | null>(null);
  const [result, setResult] = useState<{
    score: number | null;
    maxScore: number | null;
    resultsVisible: boolean;
  } | null>(null);
  const tabSwitchCount = useRef(0);
  const [, startTransition] = useTransition();

  async function loadQuestions() {
    const res = await fetch(`/api/exam/questions?slug=${encodeURIComponent(slug)}`);
    if (res.status === 401) {
      setPhase('join');
      return;
    }
    const data = await readJson(res);
    if (!res.ok || !data.ok) {
      setErrorReason(data.reason ?? 'unknown');
      setPhase('error');
      return;
    }
    const loadedQuestions = (data.questions as StudentQuestion[] | undefined) ?? [];
    setQuestions(loadedQuestions);
    setAnswers(Object.fromEntries(loadedQuestions.map((q) => [q.itemId, q.answer])));
    setDeadlineAt((data.deadlineAt as string | null | undefined) ?? null);
    setPhase('taking');
  }

  useEffect(() => {
    startTransition(() => {
      void loadQuestions();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!deadlineAt) return;
    const update = () => {
      const seconds = Math.max(0, Math.round((new Date(deadlineAt).getTime() - Date.now()) / 1000));
      setTotalSec((current) => current ?? Math.max(seconds, 1));
      setRemainingSec(seconds);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        tabSwitchCount.current += 1;
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  async function handleJoin(formData: FormData) {
    const res = await fetch('/api/exam/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug,
        displayName: formData.get('displayName') || undefined,
        studentNo: formData.get('studentNo') || undefined,
        classLabel: formData.get('classLabel') || undefined,
        joinCode: formData.get('joinCode') || undefined,
      }),
    });
    const data = await readJson(res);
    if (!res.ok || !data.ok) {
      setErrorReason(data.reason ?? 'unknown');
      setPhase('error');
      return;
    }
    await loadQuestions();
  }

  async function saveAnswer(itemId: string, answer: unknown) {
    setAnswers((current) => ({ ...current, [itemId]: answer }));
    await fetch('/api/exam/answer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug,
        itemId,
        answer,
        tabSwitchCount: tabSwitchCount.current,
      }),
    });
  }

  async function handleSubmit() {
    const res = await fetch('/api/exam/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    const data = await readJson(res);
    if (!res.ok || !data.ok) {
      setErrorReason(data.reason ?? 'unknown');
      setPhase('error');
      return;
    }
    setResult({
      score: (data.score as number | null | undefined) ?? null,
      maxScore: (data.maxScore as number | null | undefined) ?? null,
      resultsVisible: Boolean(data.resultsVisible),
    });
    setPhase('result');
  }

  if (phase === 'loading') {
    return <CenteredMessage>{t('loading')}</CenteredMessage>;
  }

  if (phase === 'error') {
    return (
      <CenteredMessage>{t('errors.generic', { reason: errorReason ?? 'unknown' })}</CenteredMessage>
    );
  }

  if (phase === 'join') {
    const required = exam.requiredFields as {
      displayName?: boolean;
      studentNo?: boolean;
      classLabel?: boolean;
    };
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
        <h1 className="text-[22px] font-semibold text-ink">{exam.title}</h1>
        <p className="mt-1 text-base text-ink-2">{t('joinDescription')}</p>
        <form action={(formData) => void handleJoin(formData)} className="mt-6 flex flex-col gap-4">
          {required.displayName !== false && (
            <Input
              name="displayName"
              placeholder={t('fields.displayName')}
              required
              className="h-12 text-base"
            />
          )}
          {required.studentNo && (
            <Input
              name="studentNo"
              placeholder={t('fields.studentNo')}
              className="h-12 text-base"
            />
          )}
          {required.classLabel && (
            <Input
              name="classLabel"
              placeholder={t('fields.classLabel')}
              className="h-12 text-base"
            />
          )}
          {exam.access === 'code' && (
            <Input
              name="joinCode"
              placeholder={t('fields.joinCode')}
              required
              className="h-12 text-base"
            />
          )}
          <Button type="submit" className="h-12 text-base">
            {t('joinButton')}
          </Button>
        </form>
      </main>
    );
  }

  if (phase === 'result' && result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16 text-center">
        <h1 className="text-[22px] font-semibold text-ink">{t('submitted.title')}</h1>
        {result.resultsVisible && result.score !== null ? (
          <p className="mt-4 text-lg text-ink">
            {t('submitted.score', { score: result.score, maxScore: result.maxScore ?? 0 })}
          </p>
        ) : (
          <p className="mt-4 text-base text-ink-2">{t('submitted.resultsHidden')}</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <div className="sticky top-0 z-10 -mx-6 bg-surface px-6 pb-3">
        <div className="flex items-center justify-between py-2">
          <h1 className="text-base font-medium text-ink">{exam.title}</h1>
          {remainingSec !== null && (
            <span className="text-base text-ink-2" aria-live="polite">
              {formatRemaining(remainingSec)}
            </span>
          )}
        </div>
        {remainingSec !== null && totalSec !== null && (
          <Progress value={remainingSec} max={totalSec} label={t('timeRemaining')} />
        )}
      </div>

      <p className="mt-2 text-sm text-ink-3">{t('tabSwitchNotice')}</p>

      <div className="mt-6 flex flex-col gap-8">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.itemId}
            index={index + 1}
            question={question}
            value={answers[question.itemId]}
            onChange={(answer) => void saveAnswer(question.itemId, answer)}
            t={t}
          />
        ))}
      </div>

      <Button className="mt-8 h-12 text-base" onClick={() => void handleSubmit()}>
        {t('submitButton')}
      </Button>
    </main>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center text-base text-ink-2">
      {children}
    </main>
  );
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function QuestionCard({
  index,
  question,
  value,
  onChange,
  t,
}: {
  readonly index: number;
  readonly question: StudentQuestion;
  readonly value: unknown;
  readonly onChange: (answer: unknown) => void;
  readonly t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="border-b border-line pb-6">
      <p className="text-base text-ink">
        <span className="text-ink-3">{index}. </span>
        {question.stemText}
      </p>
      {question.stemImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.stemImageUrl}
          alt=""
          className="mt-3 max-w-full rounded-panel border border-line"
        />
      )}
      <div className="mt-4">
        <QuestionInput question={question} value={value} onChange={onChange} t={t} />
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  t,
}: {
  readonly question: StudentQuestion;
  readonly value: unknown;
  readonly onChange: (answer: unknown) => void;
  readonly t: ReturnType<typeof useTranslations>;
}) {
  switch (question.questionType) {
    case 'mcq': {
      const current =
        isRecord(value) && typeof value.option_id === 'string' ? value.option_id : undefined;
      return (
        <RadioGroup
          value={current ?? null}
          onValueChange={(id) => onChange({ option_id: id })}
          className="flex flex-col gap-3"
        >
          {question.options.map((option) => (
            <label key={option.id} className="flex min-h-11 items-center gap-3 text-base text-ink">
              <RadioItem value={option.id} />
              {option.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={option.imageUrl}
                  alt=""
                  className="max-h-24 rounded-control border border-line"
                />
              ) : (
                option.text
              )}
            </label>
          ))}
        </RadioGroup>
      );
    }
    case 'tf': {
      const current = isRecord(value) && typeof value.value === 'boolean' ? value.value : undefined;
      return (
        <RadioGroup
          value={current === undefined ? null : String(current)}
          onValueChange={(v) => onChange({ value: v === 'true' })}
          className="flex gap-4"
        >
          <label className="flex min-h-11 items-center gap-2 text-base text-ink">
            <RadioItem value="true" /> {t('tf.true')}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-base text-ink">
            <RadioItem value="false" /> {t('tf.false')}
          </label>
        </RadioGroup>
      );
    }
    case 'numeric': {
      const current = isRecord(value) && typeof value.value === 'number' ? value.value : '';
      return (
        <Input
          type="number"
          inputMode="decimal"
          value={current}
          onChange={(e) =>
            onChange({ value: e.target.value === '' ? null : Number(e.target.value) })
          }
          className="h-12 max-w-40 text-base"
        />
      );
    }
    case 'fill': {
      const values = Array.isArray((value as { values?: unknown[] } | undefined)?.values)
        ? ((value as { values: unknown[] }).values as string[])
        : Array.from({ length: question.blankCount ?? 1 }, () => '');
      return (
        <div className="flex flex-col gap-2">
          {values.map((v, i) => (
            <Input
              key={i}
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange({ values: next });
              }}
              placeholder={t('fill.blankPlaceholder', { n: i + 1 })}
              className="h-12 max-w-sm text-base"
            />
          ))}
        </div>
      );
    }
    case 'order': {
      const order: string[] = Array.isArray(
        (value as { sequence?: unknown[] } | undefined)?.sequence,
      )
        ? (value as { sequence: string[] }).sequence
        : question.options.map((o) => o.id);
      function move(id: string, direction: -1 | 1) {
        const idx = order.indexOf(id);
        const next = [...order];
        const swapWith = idx + direction;
        if (swapWith < 0 || swapWith >= next.length) return;
        [next[idx], next[swapWith]] = [next[swapWith]!, next[idx]!];
        onChange({ sequence: next });
      }
      return (
        <ol className="flex flex-col gap-2">
          {order.map((id) => {
            const option = question.options.find((o) => o.id === id);
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2 text-base text-ink"
              >
                {option?.text}
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(id, -1)}
                    aria-label={t('order.moveUp')}
                    className="px-2"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(id, 1)}
                    aria-label={t('order.moveDown')}
                    className="px-2"
                  >
                    ↓
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      );
    }
    case 'match': {
      const pairs: { left: string; right: string }[] = Array.isArray(
        (value as { pairs?: unknown[] } | undefined)?.pairs,
      )
        ? (value as { pairs: { left: string; right: string }[] }).pairs
        : [];
      const rightByLeft = new Map(pairs.map((p) => [p.left, p.right]));
      return (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            <div key={option.id} className="flex items-center gap-3">
              <span className="min-w-32 text-base text-ink">{option.text}</span>
              <Input
                value={rightByLeft.get(option.id) ?? ''}
                onChange={(e) => {
                  rightByLeft.set(option.id, e.target.value);
                  onChange({
                    pairs: [...rightByLeft.entries()].map(([left, right]) => ({ left, right })),
                  });
                }}
                className="h-11 max-w-56 text-base"
              />
            </div>
          ))}
        </div>
      );
    }
    case 'open':
    default: {
      const current = isRecord(value) && typeof value.text === 'string' ? value.text : '';
      return (
        <Textarea
          value={current}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={4}
          className="text-base"
        />
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
