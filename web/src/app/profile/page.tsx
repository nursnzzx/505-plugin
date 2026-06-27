'use client';

import { useEffect, useState } from 'react';
import { Globe, Clock, Monitor, LogOut, Hash, Calendar, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApp } from '@/lib/store';
import { api } from '@/lib/api';
import type { Device } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

export default function ProfilePage() {
  const { user, activeLicense, loading, logout } = useApp();
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    if (!activeLicense) return;
    api
      .get<Device[]>(`/license/devices?key=${encodeURIComponent(activeLicense.key)}`)
      .then(setDevices)
      .catch(() => setDevices([]));
  }, [activeLicense]);

  if (loading) {
    return (
      <AppShell>
        <Skeleton className="h-40" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Card className="flex flex-col items-center text-center">
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-3xl object-cover ring-2 ring-accent/40" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-green-gradient text-2xl font-bold text-black">
            {(user?.fullName ?? 'KT').slice(0, 2).toUpperCase()}
          </div>
        )}
        <h1 className="mt-3 text-lg font-semibold text-white">{user?.fullName}</h1>
        {user?.username && <p className="text-sm text-muted">@{user.username}</p>}
      </Card>

      <Card delay={0.08} className="mt-4">
        <InfoRow icon={Hash} label="Telegram ID" value={user?.telegramId ?? '—'} />
        <InfoRow icon={ShieldCheck} label="License" value={activeLicense?.tier ?? 'FREE'} />
        <InfoRow icon={Calendar} label="Joined" value={formatDate(user?.createdAt)} />
        <InfoRow icon={Globe} label="Country" value={user?.country ?? '—'} />
        <InfoRow icon={Clock} label="Timezone" value={user?.timezone ?? '—'} last />
      </Card>

      <Card delay={0.16} className="mt-4">
        <div className="mb-3 flex items-center gap-2">
          <Monitor size={16} className="text-accent" />
          <h2 className="font-semibold text-white">Devices ({devices.filter((d) => d.isActive).length})</h2>
        </div>
        {devices.length === 0 ? (
          <p className="text-sm text-muted">No bound devices.</p>
        ) : (
          <ul className="space-y-3">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{d.machineName ?? d.hardwareId.slice(0, 16)}</p>
                  <p className="text-xs text-muted">
                    {d.platform} · {d.country ?? d.ip ?? 'unknown'} · seen {formatDate(d.lastSeenAt)}
                  </p>
                </div>
                <span className={`chip ${d.isActive ? 'bg-accent/15 text-accent' : 'bg-white/5 text-muted'}`}>
                  {d.isActive ? 'Active' : 'Off'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <button
        onClick={() => {
          haptic('medium');
          void logout();
        }}
        className="btn-ghost mt-4 w-full text-red-400"
      >
        <LogOut size={18} /> Log out
      </button>
    </AppShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? '' : 'border-b border-line'}`}>
      <span className="flex items-center gap-2 text-sm text-muted">
        <Icon size={15} /> {label}
      </span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
