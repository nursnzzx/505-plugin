import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma';
import { asyncHandler, ok, parsePagination } from '../../utils/http';
import { serializeUser } from './user.serializer';
import { NotFoundError } from '../../utils/errors';

export const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  country: z.string().max(64).optional(),
  city: z.string().max(64).optional(),
  timezone: z.string().max(64).optional(),
  languageCode: z.string().max(8).optional(),
});

/** GET /users/me — full profile with counts. */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const [deviceCount, licenseCount, referralCount] = await Promise.all([
    prisma.device.count({ where: { userId, isActive: true } }),
    prisma.license.count({ where: { userId } }),
    prisma.referral.count({ where: { referrerId: userId } }),
  ]);

  return ok(res, {
    ...serializeUser(user),
    stats: { devices: deviceCount, licenses: licenseCount, referrals: referralCount },
  });
});

/** PATCH /users/me */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const updated = await prisma.user.update({ where: { id: userId }, data: req.body });
  return ok(res, serializeUser(updated));
});

/** GET /users/me/activity */
export const myActivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.activity.count({ where: { userId } }),
  ]);
  return ok(res, items, { page, pageSize, total });
});

/** GET /users/me/stats — launch counters for the home page. */
export const myStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));

  const [today, week, firstActivity] = await Promise.all([
    prisma.activity.count({
      where: { userId, type: { in: ['ACTIVATE', 'VERIFY', 'HEARTBEAT'] }, createdAt: { gte: startOfDay } },
    }),
    prisma.activity.count({
      where: { userId, type: { in: ['ACTIVATE', 'VERIFY', 'HEARTBEAT'] }, createdAt: { gte: startOfWeek } },
    }),
    prisma.activity.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } }),
  ]);

  const activeDays = firstActivity
    ? Math.max(1, Math.ceil((now.getTime() - firstActivity.createdAt.getTime()) / 86_400_000))
    : 0;

  return ok(res, { launchesToday: today, launchesThisWeek: week, activeDays });
});
