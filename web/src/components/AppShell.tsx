'use client';

import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-[max(env(safe-area-inset-top),16px)]">
      {children}
      <BottomNav />
    </div>
  );
}
