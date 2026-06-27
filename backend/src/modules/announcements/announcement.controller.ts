import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma';
import { asyncHandler, ok, parsePagination } from '../../utils/http';
import { NotFoundError } from '../../utils/errors';

/** GET /news — published announcements, pinned first. */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const kind = req.query.kind ? String(req.query.kind) : undefined;
  const where = {
    isPublished: true,
    ...(kind ? { kind: kind as never } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      skip,
      take,
    }),
    prisma.announcement.count({ where }),
  ]);
  return ok(res, items, { page, pageSize, total });
});

/** GET /news/:id */
export const detail = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.announcement.findFirst({
    where: { id: req.params.id, isPublished: true },
  });
  if (!item) throw new NotFoundError('Announcement not found');
  return ok(res, item);
});
