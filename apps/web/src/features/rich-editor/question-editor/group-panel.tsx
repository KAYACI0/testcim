'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { saveGroupPassage } from '../actions.server';
import { RichTextEditor } from '../tiptap/editor';

import type { RichDoc } from '../types';

import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const EMPTY_DOC: RichDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * Minimal group-passage authoring (docs/prompts/07 §7): creates a
 * `test_groups` row with a shared passage via `saveGroupPassage`
 * (`add_group` op). Assigning individual questions to the resulting group
 * from the question strip is not wired up yet — see docs/backlog.md; the
 * op-log/RPC support for it (`set_group`) already exists.
 */
export function GroupPanel({
  open,
  onOpenChange,
  testId,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly testId: string;
}) {
  const t = useTranslations('richEditor.group');
  const [passageRich, setPassageRich] = useState<RichDoc>(EMPTY_DOC);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveGroupPassage({ testId, groupId: null, passageRich });
    setSaving(false);
    if (result.ok) {
      setPassageRich(EMPTY_DOC);
      onOpenChange(false);
    } else {
      setError(result.reason);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={t('panelTitle')} closeLabel={t('cancel')} className="max-w-xl">
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">{t('passageLabel')}</p>
          <RichTextEditor
            content={passageRich}
            onChange={setPassageRich}
            placeholder=""
            variant="passage"
          />
          {error && <InlineNotice tone="err">{error}</InlineNotice>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={() => void handleSave()} loading={saving}>
              {t('save')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
