'use client';

import { useState } from 'react';
import { Activity, CalendarDays, Rocket, KeyRound, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { LicenseCard } from '@/components/LicenseCard';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApp } from '@/lib/store';
import { api, ApiError } from '@/lib/api';
import { haptic } from '@/lib/telegram';

export default function HomePage() {
  const { user, activeLicense, stats, loading, refreshLicense } = useApp();

  return (
    <AppShell>
      <Header user={user} license={activeLicense} />

      {loading ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-3 gap-3">
            <StatCard label="Launches today" value={stats?.launchesToday ?? 0} icon={Rocket} delay={0.05} />
            <StatCard label="This week" value={stats?.launchesThisWeek ?? 0} icon={Activity} delay={0.1} />
            <StatCard label="Active days" value={stats?.activeDays ?? 0} icon={CalendarDays} delay={0.15} />
          </section>

          <section className="mt-4">
            {activeLicense ? (
              <LicenseCard license={activeLicense} delay={0.2} />
            ) : (
              <ActivatePrompt onActivated={refreshLicense} />
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

function ActivatePrompt({ onActivated }: { onActivated: () => Promise<void> }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activate = async () => {
    if (!key.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const hardwareId = `webapp-${navigator.userAgent.slice(0, 24)}`;
      await api.post('/license/activate', {
        key: key.trim().toUpperCase(),
        device: { hardwareId, platform: 'UNKNOWN', machineName: 'Telegram WebApp' },
      });
      haptic('heavy');
      await onActivated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Activation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card delay={0.2}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/12">
          <KeyRound className="text-accent" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">Activate your license</h2>
        <p className="mt-1 text-sm text-muted">Enter a key to unlock your KantTools plan.</p>
      </div>
      <input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="KT-XXXX-XXXX-XXXX-XXXX"
        className="mt-5 w-full rounded-xl bg-bg-elevated px-4 py-3 text-center font-mono uppercase tracking-wider text-white outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
      />
      {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
      <button onClick={activate} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? <Loader2 className="animate-spin" size={18} /> : 'Activate'}
      </button>
    </Card>
  );
}
