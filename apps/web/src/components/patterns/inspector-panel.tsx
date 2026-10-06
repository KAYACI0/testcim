'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import type { ReactNode } from 'react';

export interface InspectorPanelSection {
  readonly value: string;
  readonly label: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}

export interface InspectorPanelProps {
  readonly title: string;
  readonly sections: readonly InspectorPanelSection[];
  readonly defaultValue: string;
}

export function InspectorPanel({ title, sections, defaultValue }: InspectorPanelProps) {
  return (
    <aside className="flex h-full w-full min-w-0 shrink-0 flex-col border-t border-line lg:w-72 lg:border-t-0 lg:border-l">
      <h2 className="px-4 pt-4 pb-2 text-sm font-medium text-ink">{title}</h2>
      <Tabs defaultValue={defaultValue} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="gap-3 overflow-x-auto px-4">
          {sections.map((section) => (
            <TabsTrigger key={section.value} value={section.value} disabled={section.disabled}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((section) => (
          <TabsContent
            key={section.value}
            value={section.value}
            className="flex-1 overflow-y-auto px-4"
          >
            {section.content}
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  );
}
