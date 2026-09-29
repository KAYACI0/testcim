'use client';

import katex from 'katex';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Symbol {
  readonly latex: string;
  /** What actually gets inserted; `#0` marks the placeholder MathLive selects next. */
  readonly insert: string;
}

const BASIC: readonly Symbol[] = [
  { latex: '\\frac{a}{b}', insert: '\\frac{#0}{#0}' },
  { latex: '\\sqrt{a}', insert: '\\sqrt{#0}' },
  { latex: '\\sqrt[n]{a}', insert: '\\sqrt[#0]{#0}' },
  { latex: 'a^{2}', insert: '#0^{#0}' },
  { latex: 'a_{n}', insert: '#0_{#0}' },
  { latex: '\\int', insert: '\\int_{#0}^{#0}' },
  { latex: '\\sum', insert: '\\sum_{#0}^{#0}' },
  { latex: '\\lim', insert: '\\lim_{#0}' },
  { latex: '\\infty', insert: '\\infty' },
  { latex: '\\leq', insert: '\\leq' },
  { latex: '\\geq', insert: '\\geq' },
  { latex: '\\neq', insert: '\\neq' },
];

const GREEK: readonly Symbol[] = [
  { latex: '\\alpha', insert: '\\alpha' },
  { latex: '\\beta', insert: '\\beta' },
  { latex: '\\gamma', insert: '\\gamma' },
  { latex: '\\delta', insert: '\\delta' },
  { latex: '\\theta', insert: '\\theta' },
  { latex: '\\pi', insert: '\\pi' },
  { latex: '\\lambda', insert: '\\lambda' },
  { latex: '\\mu', insert: '\\mu' },
  { latex: '\\sigma', insert: '\\sigma' },
  { latex: '\\phi', insert: '\\phi' },
  { latex: '\\omega', insert: '\\omega' },
  { latex: '\\Delta', insert: '\\Delta' },
];

const MATRIX: readonly Symbol[] = [
  {
    latex: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}',
    insert: '\\begin{pmatrix}#0&#0\\\\#0&#0\\end{pmatrix}',
  },
  {
    latex: '\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}',
    insert: '\\begin{vmatrix}#0&#0\\\\#0&#0\\end{vmatrix}',
  },
];

function render(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false });
  } catch {
    return latex;
  }
}

function SymbolGrid({
  symbols,
  onInsert,
}: {
  symbols: readonly Symbol[];
  onInsert: (s: string) => void;
}) {
  const rendered = useMemo(() => symbols.map((s) => ({ ...s, html: render(s.latex) })), [symbols]);

  return (
    <div className="grid grid-cols-6 gap-1">
      {rendered.map((symbol) => (
        <button
          key={symbol.latex}
          type="button"
          onClick={() => onInsert(symbol.insert)}
          className="flex h-9 items-center justify-center rounded-control text-ink-2 hover:bg-canvas hover:text-ink"
          dangerouslySetInnerHTML={{ __html: symbol.html }}
        />
      ))}
    </div>
  );
}

/**
 * Testcim's own equation symbol palette (docs/prompts/07 §3): styled with
 * the design token layer, not MathLive's built-in virtual keyboard. Each
 * button inserts a LaTeX snippet via `field.insert()`.
 */
export function SymbolPalette({ onInsert }: { readonly onInsert: (latex: string) => void }) {
  const t = useTranslations('richEditor.equation');

  return (
    <Tabs defaultValue="basic" className="mt-2">
      <TabsList>
        <TabsTrigger value="basic">{t('paletteBasic')}</TabsTrigger>
        <TabsTrigger value="greek">{t('paletteGreek')}</TabsTrigger>
        <TabsTrigger value="matrix">{t('paletteMatrix')}</TabsTrigger>
      </TabsList>
      <TabsContent value="basic">
        <SymbolGrid symbols={BASIC} onInsert={onInsert} />
      </TabsContent>
      <TabsContent value="greek">
        <SymbolGrid symbols={GREEK} onInsert={onInsert} />
      </TabsContent>
      <TabsContent value="matrix">
        <SymbolGrid symbols={MATRIX} onInsert={onInsert} />
      </TabsContent>
    </Tabs>
  );
}
