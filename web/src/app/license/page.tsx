'use client';

import { useEffect, useState } from 'react';
import { History, RefreshCw, ArrowUpCircle, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { LicenseCard } from '@/components/LicenseCard';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApp } from '@/lib/store';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

interface HistoryItem {
  id: string;
  action: string;
  toStatus: string | null;
  createdAt: string;
}

export default function LicensePage() {
  const { activeLicense, loading, refreshLicense } = useApp();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    if (!activeLicense) return;
    api
      .get<HistoryItem[]>(`/license/history?key=${encodeURIComponent(activeLicense.key)}`)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [activeLicense]);

  const renew = async () => {
    if (!activeLicense) return;
    setRenewing(true);
    try {
      await api.post('/license/renew', { key: activeLicense.key, days: 30 });
      haptic('heavy');
      await refreshLicense();
    } finally {
      setRenewing(false);
    }
  };

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-white">License</h1>
      <p className="text-sm text-muted">Manage your plan and view activation history.</p>

      {loading ? (
        <Skeleton className="mt-5 h-64" />
      ) : activeLicense ? (
        <>
          <div className="mt-5">
            <LicenseCard license={activeLicense} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={renew} disabled={renewing} className="btn-primary">
              {renewing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Renew +30d
            </button>
            <a href="/apps" className="btn-ghost">
              <ArrowUpCircle size={18} /> Upgrade
            </a>
          </div>

          <Card delay={0.15} className="mt-4">
            <div className="mb-3 flex items-center gap-2">
              <History size={16} className="text-accent" />
              <h2 className="font-semibold text-white">Activation history</h2>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted">No history yet.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-white">{prettyAction(h.action)}</p>
                      <p className="text-xs text-muted">{formatDate(h.createdAt)}</p>
                    </div>
                    {h.toStatus && <span className="chip bg-white/5 text-muted">{h.toStatus}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <Card className="mt-5 text-center text-sm text-muted">No active license. Activate one from the Home tab.</Card>
      )}
    </AppShell>
  );
}

function prettyAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
