'use client';

import { createContext, useContext } from 'react';

import type { Entitlements } from '@testcim/shared';

import type { ReactNode } from 'react';

const EntitlementsContext = createContext<Entitlements | null>(null);

export function WorkspaceProvider({
  entitlements,
  children,
}: {
  readonly entitlements: Entitlements;
  readonly children: ReactNode;
}) {
  return (
    <EntitlementsContext.Provider value={entitlements}>{children}</EntitlementsContext.Provider>
  );
}

/** Reads one entitlement for the active workspace (set by `WorkspaceProvider` in the app layout). */
export function useEntitlement<K extends keyof Entitlements>(key: K): Entitlements[K] {
  const entitlements = useContext(EntitlementsContext);

  if (!entitlements) {
    throw new Error('useEntitlement must be used within WorkspaceProvider');
  }

  return entitlements[key];
}
