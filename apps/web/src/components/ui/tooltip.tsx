'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export const TooltipProvider = RadixTooltip.Provider;

export interface TooltipProps {
  readonly content: string;
  readonly children: ReactNode;
  readonly side?: ComponentPropsWithoutRef<typeof RadixTooltip.Content>['side'];
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Root delayDuration={300}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-[4px] bg-ink px-2 py-1 text-xs text-surface shadow-float"
        >
          {content}
          <RadixTooltip.Arrow className="fill-ink" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
