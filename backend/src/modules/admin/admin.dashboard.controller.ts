import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma';
import { asyncHandler, ok } from '../../utils/http';

/** GET /admin/dashboard — headline KPIs + charts. */
export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [
    totalUsers,
    newUsers30,
    totalLicenses,
    activeLicenses,
    trialLicenses,
    expiredLicenses,
    totalDevices,
    revenueAgg,
    payments30,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.license.count(),
    prisma.license.count({ where: { status: 'ACTIVE' } }),
    prisma.license.count({ where: { status: 'TRIAL' } }),
    prisma.license.count({ where: { status: 'EXPIRED' } }),
    prisma.device.count({ where: { isActive: true } }),
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: 'PAID' } }),
    prisma.payment.findMany({
      where: { status: 'PAID', paidAt: { gte: since30 } },
      select: { amountCents: true, paidAt: true },
    }),
  ]);

  // Licenses by tier for a pie chart.
  const byTier = await prisma.license.groupBy({ by: ['tier'], _count: { _all: true } });

  // New users per day (last 14 days) for the trend chart.
  const since14 = new Date(Date.now() - 14 * 86_400_000);
  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: since14 } },
    select: { createdAt: true },
  });
  const usersByDay = bucketByDay(recentUsers.map((u) => u.createdAt), 14);
  const revenueByDay = bucketSumByDay(
    payments30.map((p) => ({ date: p.paidAt!, value: p.amountCents })),
    30,
  );

  return ok(res, {
    kpis: {
      totalUsers,
      newUsers30,
      totalLicenses,
      activeLicenses,
      trialLicenses,
      expiredLicenses,
      activeDevices: totalDevices,
      revenueCents: revenueAgg._sum.amountCents ?? 0,
    },
    charts: {
      licensesByTier: byTier.map((t) => ({ tier: t.tier, count: t._count._all })),
      usersByDay,
      revenueByDay,
    },
  });
});

function bucketByDay(dates: Date[], days: number) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

function bucketSumByDay(items: { date: Date; value: number }[], days: number) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const { date, value } of items) {
    const key = date.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + value);
  }
  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}
