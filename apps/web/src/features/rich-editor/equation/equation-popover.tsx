'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { SymbolPalette } from './symbol-palette';

import type { MathfieldElement } from 'mathlive';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface EquationSubmitValue {
  readonly latex: string;
  readonly altText: string;
}

export interface EquationPopoverProps {
  readonly latex: string;
  readonly altText: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (value: EquationSubmitValue) => void;
  readonly children: ReactNode;
}

/**
 * The editable fields, mounted fresh every time the popover opens (see the
 * `{open && ...}` guard below) so `pendingLatex`/`pendingAlt` always start
 * from the node's current `latex`/`altText` without a sync effect — a
 * cancelled edit from a previous open can never leak into the next one.
 */
function EquationFields({
  latex,
  altText,
  onCancel,
  onSubmit,
}: {
  latex: string;
  altText: string;
  onCancel: () => void;
  onSubmit: (value: EquationSubmitValue) => void;
}) {
  const t = useTranslations('richEditor.equation');
  const fieldRef = useRef<MathfieldElement | null>(null);
  const [pendingLatex, setPendingLatex] = useState(latex);
  const [pendingAlt, setPendingAlt] = useState(altText);

  useEffect(() => {
    void import('mathlive');
  }, []);

  return (
    <>
      <p className="mb-2 text-sm font-medium text-ink">{t('editorTitle')}</p>
      <math-field
        ref={(el: MathfieldElement | null) => {
          fieldRef.current = el;
          if (!el) {
            return;
          }
          el.mathVirtualKeyboardPolicy = 'manual';
          el.value = latex;
        }}
        onInput={(event) => setPendingLatex((event.target as MathfieldElement).value)}
        className="block w-full rounded-control border border-line bg-canvas px-2 py-2 text-base"
      />
      <SymbolPalette
        onInsert={(latexSnippet) => {
          const field = fieldRef.current;
          if (!field) {
            return;
          }
          field.focus();
          field.insert(latexSnippet);
          setPendingLatex(field.value);
        }}
      />
      <label className="mt-3 block text-xs text-ink-2" htmlFor="equation-alt-text">
        {t('altTextLabel')}
      </label>
      <input
        id="equation-alt-text"
        value={pendingAlt}
        onChange={(event) => setPendingAlt(event.target.value)}
        placeholder={t('altTextPlaceholder')}
        className="mt-1 w-full rounded-control border border-line bg-canvas px-2 py-1.5 text-sm"
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button
          size="sm"
          disabled={pendingLatex.trim().length === 0}
          onClick={() => onSubmit({ latex: pendingLatex, altText: pendingAlt })}
        >
          {t('apply')}
        </Button>
      </div>
    </>
  );
}

/**
 * MathLive-backed equation editor (docs/prompts/07 §3): `mathVirtualKeyboardPolicy
 * = 'manual'` turns off MathLive's own virtual keyboard chrome so the only UI
 * the teacher sees is our token-styled `SymbolPalette` — MathLive is used
 * purely as the math input engine (LaTeX in, LaTeX out via `field.insert()`),
 * never its default look. `mathlive` is imported dynamically so the
 * `<math-field>` custom element registers only on the client, once, and only
 * where an equation is actually being edited (docs/02 §8 performance budget).
 */
export function EquationPopover({
  latex,
  altText,
  open,
  onOpenChange,
  onSubmit,
  children,
}: EquationPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[420px]" onOpenAutoFocus={(event) => event.preventDefault()}>
        {open && (
          <EquationFields
            latex={latex}
            altText={altText}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
