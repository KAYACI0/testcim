'use client';

import { useId, useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

export interface FaqItem {
  readonly id: string;
  readonly q: string;
  readonly a: string;
}

/** One-open-at-a-time accordion; the answer height animates with a grid-rows transition. */
export function FaqAccordion({ items }: { readonly items: readonly FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const baseId = useId();

  return (
    <div className="border-t border-line">
      {items.map((item) => {
        const open = openId === item.id;
        const buttonId = `${baseId}-${item.id}-q`;
        const panelId = `${baseId}-${item.id}-a`;

        return (
          <div key={item.id} className="border-b border-line">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-xl font-medium text-ink hover:text-accent"
              >
                {item.q}
                <span
                  className={cn(
                    'shrink-0 text-ink-2 transition-transform duration-[var(--duration-slow)] ease-out',
                    open && 'rotate-45',
                  )}
                >
                  <Icon name="plus" size={22} />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden" inert={!open}>
                <p className="max-w-2xl pb-6 text-lg text-ink-2">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
