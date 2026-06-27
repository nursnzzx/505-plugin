import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

export function tierColor(tier: string): string {
  switch (tier) {
    case 'ULTIMATE':
      return 'text-amber-400';
    case 'PRO':
      return 'text-accent';
    case 'TRIAL':
      return 'text-sky-400';
    default:
      return 'text-muted';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
    case 'TRIAL':
      return 'bg-accent/15 text-accent';
    case 'EXPIRED':
      return 'bg-red-500/15 text-red-400';
    case 'SUSPENDED':
    case 'BLOCKED':
    case 'REVOKED':
      return 'bg-orange-500/15 text-orange-400';
    default:
      return 'bg-white/10 text-muted';
  }
}
