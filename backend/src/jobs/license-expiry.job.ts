import { prisma } from '../database/prisma';
import { logger } from '../config/logger';
import { createNotification } from '../services/notification.service';

/**
 * Periodic job: expires overdue licenses and warns users whose license is within
 * 3 days of expiry. Runs in-process on an interval; in production move to a
 * dedicated worker / cron.
 */
export async function runLicenseExpirySweep(): Promise<void> {
  const now = new Date();

  // 1) Expire licenses past their date that are still active.
  const expired = await prisma.license.updateMany({
    where: { status: { in: ['ACTIVE', 'TRIAL'] }, expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  if (expired.count) logger.info({ count: expired.count }, 'Licenses expired');

  // 2) Warn about licenses expiring within 3 days (once).
  const soon = new Date(now.getTime() + 3 * 86_400_000);
  const expiring = await prisma.license.findMany({
    where: { status: { in: ['ACTIVE', 'TRIAL'] }, expiresAt: { gte: now, lte: soon }, userId: { not: null } },
    include: { user: true },
  });

  for (const license of expiring) {
    if (!license.user) continue;
    const already = await prisma.notification.findFirst({
      where: {
        userId: license.user.id,
        type: 'LICENSE_EXPIRING',
        createdAt: { gte: new Date(now.getTime() - 86_400_000) },
      },
    });
    if (already) continue;
    await createNotification({
      userId: license.user.id,
      type: 'LICENSE_EXPIRING',
      title: 'License expiring soon',
      body: `Your ${license.tier} license expires on ${license.expiresAt?.toDateString()}. Renew to keep access.`,
      channel: 'TELEGRAM',
      telegramId: license.user.telegramId,
    });
  }
}

let timer: NodeJS.Timeout | null = null;

export function startJobs(): void {
  // Run shortly after boot, then every hour.
  setTimeout(() => void runLicenseExpirySweep().catch((err) => logger.error({ err }, 'expiry sweep failed')), 10_000);
  timer = setInterval(
    () => void runLicenseExpirySweep().catch((err) => logger.error({ err }, 'expiry sweep failed')),
    3_600_000,
  );
}

export function stopJobs(): void {
  if (timer) clearInterval(timer);
}
