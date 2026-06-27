import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { asyncHandler, getClientIp, ok } from '../../utils/http';
import { logActivity } from '../../services/activity.service';

export const crashSchema = z.object({
  key: z.string().optional(),
  hardwareId: z.string().optional(),
  pluginVersion: z.string().optional(),
  message: z.string().max(2000),
  stack: z.string().max(20000).optional(),
  context: z.record(z.unknown()).optional(),
});

export const logsSchema = z.object({
  key: z.string().optional(),
  hardwareId: z.string().optional(),
  lines: z.array(z.string()).max(2000),
});

/** POST /plugin/crash — desktop plugin reports a crash. */
export const reportCrash = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof crashSchema>;
  const license = body.key ? await prisma.license.findUnique({ where: { key: body.key } }) : null;
  logActivity({
    type: 'CRASH',
    userId: license?.userId,
    licenseId: license?.id,
    message: body.message.slice(0, 500),
    meta: { stack: body.stack, context: body.context, pluginVersion: body.pluginVersion } as Prisma.InputJsonValue,
    ip: getClientIp(req),
  });
  return ok(res, { received: true });
});

/** POST /plugin/logs — bulk log upload, stored as a single activity entry. */
export const uploadLogs = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof logsSchema>;
  const license = body.key ? await prisma.license.findUnique({ where: { key: body.key } }) : null;
  logActivity({
    type: 'CRASH',
    userId: license?.userId,
    licenseId: license?.id,
    message: 'log upload',
    meta: { lineCount: body.lines.length, sample: body.lines.slice(-50) } as Prisma.InputJsonValue,
    ip: getClientIp(req),
  });
  return ok(res, { received: true, lines: body.lines.length });
});

/** GET /plugin/bootstrap — everything the plugin needs on startup. */
export const bootstrap = asyncHandler(async (_req: Request, res: Response) => {
  const [latest, announcements] = await Promise.all([
    prisma.pluginVersion.findMany({ where: { isLatest: true } }),
    prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 10,
    }),
  ]);
  return ok(res, { latestVersions: latest, announcements });
});
