export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export interface Remaining {
  expired: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
}

export function remainingUntil(expiresAt: Date | null): Remaining | null {
  if (!expiresAt) return null; // lifetime
  const totalMs = expiresAt.getTime() - Date.now();
  if (totalMs <= 0) {
    return { expired: true, totalMs: 0, days: 0, hours: 0, minutes: 0 };
  }
  return {
    expired: false,
    totalMs,
    days: Math.floor(totalMs / MS_PER_DAY),
    hours: Math.floor((totalMs % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((totalMs % MS_PER_HOUR) / 60_000),
  };
}

/** Progress 0..1 of elapsed time between issue and expiry. */
export function lifecycleProgress(issuedAt: Date, expiresAt: Date | null): number {
  if (!expiresAt) return 0;
  const total = expiresAt.getTime() - issuedAt.getTime();
  if (total <= 0) return 1;
  const elapsed = Date.now() - issuedAt.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}
