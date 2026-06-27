'use client';

import { useState } from 'react';
import { Copy, Check, ShieldCheck, ShieldAlert, Monitor } from 'lucide-react';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import type { License } from '@/lib/types';
import { cn, formatDate, statusColor, tierColor } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

export function LicenseCard({ license, delay = 0 }: { license: License; delay?: number }) {
  const [copied, setCopied] = useState(false);
  const remaining = license.remaining;
  const danger = !remaining || remaining.days < 3;

  const copy = async () => {
    await navigator.clipboard.writeText(license.key);
    haptic('medium');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card delay={delay} className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted">License key</p>
          <p className="mt-1 font-mono text-sm tracking-wider text-white">{license.key}</p>
        </div>
        <button
          onClick={copy}
          className="btn rounded-lg bg-bg-elevated p-2 text-accent"
          aria-label="Copy key"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className={cn('chip bg-white/5', tierColor(license.tier))}>{license.tier}</span>
        <span className={cn('chip', statusColor(license.status))}>{license.status}</span>
        <span
          className={cn(
            'chip ml-auto',
            license.signatureValid ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-400',
          )}
        >
          {license.signatureValid ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
          {license.signatureValid ? 'Verified' : 'Invalid'}
        </span>
      </div>

      {remaining && !remaining.expired ? (
        <div className="mt-5">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-xs text-muted">Remaining</span>
            <span className="text-sm font-semibold text-white">
              {remaining.days}d {remaining.hours}h {remaining.minutes}m
            </span>
          </div>
          <ProgressBar value={1 - license.progress} danger={danger} />
        </div>
      ) : (
        <div className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          License expired — renew to restore access.
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Field label="Created" value={formatDate(license.issuedAt)} />
        <Field label="Expires" value={license.expiresAt ? formatDate(license.expiresAt) : 'Lifetime'} />
        <Field label="Activations" value={String(license.activationCount)} />
        <div>
          <p className="text-xs text-muted">Devices</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-medium text-white">
            <Monitor size={14} className="text-accent" />
            {license.currentDevices}/{license.maxDevices}
          </p>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-medium text-white">{value}</p>
    </div>
  );
}
