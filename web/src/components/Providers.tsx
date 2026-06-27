'use client';

import { useEffect, type ReactNode } from 'react';
import { useApp } from '@/lib/store';

export function Providers({ children }: { children: ReactNode }) {
  const authenticate = useApp((s) => s.authenticate);

  useEffect(() => {
    void authenticate();
  }, [authenticate]);

  return <>{children}</>;
}
