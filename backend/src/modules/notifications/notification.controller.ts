import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma';
import { asyncHandler, ok, parsePagination } from '../../utils/http';
import { markAllRead, markNotificationRead } from '../../services/notification.service';

/** GET /notifications */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return ok(res, items, { page, pageSize, total, unread });
});

/** POST /notifications/:id/read */
export const read = asyncHandler(async (req: Request, res: Response) => {
  await markNotificationRead(req.auth!.sub, req.params.id);
  return ok(res, { read: true });
});

/** POST /notifications/read-all */
export const readAll = asyncHandler(async (req: Request, res: Response) => {
  await markAllRead(req.auth!.sub);
  return ok(res, { read: true });
});
