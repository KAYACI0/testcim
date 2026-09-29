'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DrawingModal } from './drawing-modal';

import type { DrawingNodeAttrs } from './drawing-modal';
import type { NodeViewProps } from '@tiptap/react';

export function DrawingNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const t = useTranslations('richEditor.drawing');
  const [open, setOpen] = useState(false);
  const attrs = node.attrs as unknown as DrawingNodeAttrs;

  return (
    <NodeViewWrapper className="my-2">
      <button
        type="button"
        aria-label={attrs.altText || t('editAria')}
        onClick={() => setOpen(true)}
        className={`block rounded-control p-1 outline-none hover:bg-canvas ${selected ? 'ring-1 ring-accent' : ''}`}
      >
        {attrs.svg ? (
          <span dangerouslySetInnerHTML={{ __html: attrs.svg }} />
        ) : (
          <span className="text-sm text-ink-2 italic">{t('placeholder')}</span>
        )}
      </button>
      <DrawingModal
        open={open}
        onOpenChange={setOpen}
        initial={attrs}
        onSubmit={(next) => updateAttributes(next)}
      />
    </NodeViewWrapper>
  );
}
