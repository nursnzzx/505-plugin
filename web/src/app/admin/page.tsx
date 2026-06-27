'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, KeyRound, Activity, DollarSign, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

interface Dashboard {
  kpis: {
    totalUsers: number;
    newUsers30: number;
    totalLicenses: number;
    activeLicenses: number;
    trialLicenses: number;
    expiredLicenses: number;
    activeDevices: number;
    revenueCents: number;
  };
  charts: {
    licensesByTier: { tier: string; count: number }[];
    usersByDay: { date: string; count: number }[];
    revenueByDay: { date: string; value: number }[];
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Dashboard>('/admin/dashboard')
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.push('/admin/login');
        } else setError('Failed to load dashboard');
      });
  }, [router]);

  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!data)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );

  const { kpis, charts } = data;
  const maxUsers = Math.max(1, ...charts.usersByDay.map((d) => d.count));

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-muted">Nurse 505 control panel</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={Users} label="Total users" value={kpis.totalUsers} sub={`+${kpis.newUsers30} / 30d`} />
        <Kpi icon={KeyRound} label="Active licenses" value={kpis.activeLicenses} sub={`${kpis.totalLicenses} total`} />
        <Kpi icon={Activity} label="Active devices" value={kpis.activeDevices} sub={`${kpis.trialLicenses} trials`} />
        <Kpi icon={DollarSign} label="Revenue" value={formatMoney(kpis.revenueCents)} sub="lifetime paid" />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-semibold text-white">New users (14 days)</h2>
          <div className="flex h-44 items-end gap-1.5">
            {charts.usersByDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-green-gradient"
                  style={{ height: `${(d.count / maxUsers) * 100}%`, minHeight: 2 }}
                  title={`${d.date}: ${d.count}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-semibold text-white">Licenses by tier</h2>
          <ul className="space-y-3">
            {charts.licensesByTier.map((t) => {
              const total = charts.licensesByTier.reduce((a, b) => a + b.count, 0) || 1;
              return (
                <li key={t.tier}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-white/80">{t.tier}</span>
                    <span className="text-muted">{t.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full bg-green-gradient" style={{ width: `${(t.count / total) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <nav className="mt-8 flex flex-wrap gap-3 text-sm">
        {['users', 'licenses', 'payments', 'promos', 'plugins', 'logs'].map((s) => (
          <span key={s} className="chip bg-bg-elevated capitalize text-white/70">
            {s}
          </span>
        ))}
      </nav>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div className="card p-5">
      <Icon size={20} className="text-accent" />
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-[11px] text-accent">{sub}</p>
    </div>
  );
}
