'use client';

import { NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { EquationPopover } from './equation-popover';

import type { NodeViewProps } from '@tiptap/react';

import { cn } from '@/lib/cn';

/**
 * Display form of an `equation` node: KaTeX renders `attrs.latex` read-only;
 * clicking it opens `EquationPopover` (MathLive) to edit. docs/prompts/07 §8
 * (accessibility) requires an alt-text fallback for screen readers, since
 * KaTeX's HTML output is decorative markup, not readable text.
 */
export function EquationNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const t = useTranslations('richEditor.equation');
  const [open, setOpen] = useState(false);
  const latex = (node.attrs.latex as string) ?? '';
  const altText = (node.attrs.altText as string) ?? '';

  const html = useMemo(() => {
    if (!latex.trim()) {
      return null;
    }
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: false });
    } catch {
      return null;
    }
  }, [latex]);

  return (
    <NodeViewWrapper as="span" className="relative inline-block align-middle">
      <EquationPopover
        latex={latex}
        altText={altText}
        open={open}
        onOpenChange={setOpen}
        onSubmit={(next) => {
          updateAttributes({ latex: next.latex, altText: next.altText });
          setOpen(false);
        }}
      >
        <button
          type="button"
          aria-label={altText || t('editAria')}
          onClick={() => setOpen(true)}
          className={cn(
            'rounded-[4px] px-0.5 outline-none',
            'hover:bg-accent-tint',
            selected && 'bg-accent-tint ring-1 ring-accent',
          )}
        >
          {html ? (
            <span dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <span className="text-sm text-ink-2 italic">{t('placeholder')}</span>
          )}
        </button>
      </EquationPopover>
    </NodeViewWrapper>
  );
}
