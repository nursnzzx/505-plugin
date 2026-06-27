'use client';

import { useEffect, useState } from 'react';
import { Download, Package, Check, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import type { Plan, PluginVersion } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

export default function AppsPage() {
  const [plugins, setPlugins] = useState<PluginVersion[] | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    api.get<PluginVersion[]>('/plugins').then(setPlugins).catch(() => setPlugins([]));
    api.get<Plan[]>('/payments/plans').then(setPlans).catch(() => setPlans([]));
  }, []);

  const download = async (p: PluginVersion) => {
    haptic('medium');
    const res = await api.post<{ downloadUrl: string }>(`/plugins/${p.slug}/download`, { versionId: p.id });
    window.open(res.downloadUrl, '_blank');
  };

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-white">Applications</h1>
      <p className="text-sm text-muted">Download plugins and review release notes.</p>

      <section className="mt-5 space-y-3">
        {!plugins
          ? [0, 1].map((i) => <Skeleton key={i} className="h-28" />)
          : plugins.map((p, i) => (
              <Card key={p.id} delay={i * 0.06}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12">
                    <Package className="text-accent" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-muted">
                      v{p.version} · {(p.fileSizeBytes / 1_048_576).toFixed(1)} MB · {p.channel}
                    </p>
                    {p.releaseNotes && (
                      <p className="mt-2 line-clamp-2 text-xs text-white/70">{p.releaseNotes}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => download(p)} className="btn-primary mt-3 w-full">
                  <Download size={18} /> Download
                </button>
              </Card>
            ))}
      </section>

      <h2 className="mt-8 text-lg font-bold text-white">Pricing</h2>
      <section className="mt-3 space-y-3">
        {!plans
          ? [0, 1].map((i) => <Skeleton key={i} className="h-32" />)
          : plans
              .filter((p) => p.tier !== 'FREE')
              .map((plan, i) => <PlanCard key={plan.id} plan={plan} delay={i * 0.06} />)}
      </section>
    </AppShell>
  );
}

function PlanCard({ plan, delay }: { plan: Plan; delay: number }) {
  const [busy, setBusy] = useState(false);
  const buy = async () => {
    setBusy(true);
    haptic('medium');
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/invoice', {
        planId: plan.id,
        provider: 'TELEGRAM_STARS',
      });
      window.open(res.invoiceUrl, '_blank');
    } finally {
      setBusy(false);
    }
  };

  const features = Array.isArray(plan.features) ? plan.features : [];

  return (
    <Card delay={delay} className="relative">
      {plan.tier === 'ULTIMATE' && (
        <span className="absolute right-4 top-4 chip bg-amber-400/15 text-amber-400">Best value</span>
      )}
      <p className="text-sm text-muted">{plan.name}</p>
      <p className="mt-1 text-2xl font-bold text-white">
        {formatMoney(plan.priceCents, plan.currency)}
        <span className="text-sm font-normal text-muted">
          {plan.durationDays ? ` / ${plan.durationDays}d` : ''}
        </span>
      </p>
      <ul className="mt-3 space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-white/80">
            <Check size={15} className="text-accent" /> {f}
          </li>
        ))}
      </ul>
      <button onClick={buy} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? <Loader2 size={18} className="animate-spin" /> : 'Get ' + plan.name}
      </button>
    </Card>
  );
}
