'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createComment,
  listComments,
  listSnapshots,
  resolveComment,
  restoreSnapshot,
  setApprovalStatus,
  type CommentRow,
  type SnapshotRow,
} from '@/features/collaboration/actions.server';

const APPROVAL_STATUSES = ['draft', 'in_review', 'approved'] as const;
type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export function CollaborationPanel({
  open,
  onOpenChange,
  testId,
  approvalStatus,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly testId: string;
  readonly approvalStatus: ApprovalStatus;
}) {
  const t = useTranslations('collaboration');
  const [comments, setComments] = useState<readonly CommentRow[]>([]);
  const [snapshots, setSnapshots] = useState<readonly SnapshotRow[]>([]);
  const [status, setStatus] = useState<ApprovalStatus>(approvalStatus);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [commentPending, startCommentTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [restorePending, startRestoreTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    void listComments('test', testId).then(setComments);
    void listSnapshots(testId).then(setSnapshots);
  }, [open, testId]);

  function handleAddComment() {
    if (!draft.trim()) return;
    startCommentTransition(async () => {
      const result = await createComment({ resourceType: 'test', resourceId: testId, body: draft });
      if (!result.ok) {
        setError(t('commentError'));
        return;
      }
      setDraft('');
      setComments(await listComments('test', testId));
    });
  }

  function handleResolve(commentId: string) {
    startCommentTransition(async () => {
      await resolveComment(commentId);
      setComments(await listComments('test', testId));
    });
  }

  function handleStatusChange(next: ApprovalStatus) {
    startStatusTransition(async () => {
      const result = await setApprovalStatus({ testId, status: next });
      if (!result.ok) {
        setError(t('approvalError'));
        return;
      }
      setStatus(next);
    });
  }

  function handleRestore(revision: number) {
    startRestoreTransition(async () => {
      const result = await restoreSnapshot(testId, revision);
      if (!result.ok) {
        setError(t('restoreError'));
        return;
      }
      setSnapshots(await listSnapshots(testId));
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('title')} closeLabel={t('close')} className="max-w-xl">
        <Tabs defaultValue="comments">
          <TabsList>
            <TabsTrigger value="comments">{t('tabs.comments')}</TabsTrigger>
            <TabsTrigger value="approval">{t('tabs.approval')}</TabsTrigger>
            <TabsTrigger value="history">{t('tabs.history')}</TabsTrigger>
          </TabsList>

          {error && <InlineNotice tone="err">{error}</InlineNotice>}

          <TabsContent value="comments">
            <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-ink-2">{t('noComments')}</p>}
              {comments.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-1 border-b border-line pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{comment.author_name}</span>
                    {comment.resolved_at ? (
                      <Badge tone="ok">{t('resolved')}</Badge>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-ink-2 hover:text-accent"
                        onClick={() => handleResolve(comment.id)}
                      >
                        {t('resolveAction')}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-ink-2">{comment.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t('commentPlaceholder')}
                className="min-h-20 w-full rounded-control border border-line-strong bg-surface p-2 text-sm text-ink outline-none focus-visible:border-accent"
              />
              <Button
                onClick={handleAddComment}
                loading={commentPending}
                disabled={!draft.trim()}
                className="self-end"
              >
                {t('addCommentAction')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="approval">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-2">{t('approvalHint')}</p>
              <Select
                value={status}
                onValueChange={(value) => handleStatusChange(value as ApprovalStatus)}
              >
                <SelectTrigger disabled={statusPending} className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPROVAL_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`status.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {snapshots.length === 0 && <p className="text-sm text-ink-2">{t('noHistory')}</p>}
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.revision}
                  className="flex items-center justify-between gap-2 border-b border-line pb-2 text-sm"
                >
                  <span className="text-ink-2">
                    {t('revisionLabel', { revision: snapshot.revision })} -{' '}
                    {new Date(snapshot.created_at).toLocaleString('tr-TR')}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={restorePending}
                    onClick={() => handleRestore(snapshot.revision)}
                  >
                    {t('restoreAction')}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
