import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma';
import { asyncHandler, getClientIp, ok } from '../../utils/http';
import { logActivity } from '../../services/activity.service';
import { NotFoundError } from '../../utils/errors';

export const checkUpdateSchema = z.object({
  slug: z.string().min(1),
  currentVersion: z.string().optional(),
  channel: z.string().default('stable'),
});

/** GET /plugins — list all plugins with their latest stable version. */
export const list = asyncHandler(async (_req: Request, res: Response) => {
  const versions = await prisma.pluginVersion.findMany({
    where: { isLatest: true },
    orderBy: { slug: 'asc' },
  });
  return ok(res, versions);
});

/** GET /plugins/:slug/versions */
export const versions = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const items = await prisma.pluginVersion.findMany({
    where: { slug },
    orderBy: { publishedAt: 'desc' },
  });
  return ok(res, items);
});

/** GET /plugins/:slug/latest?channel=stable */
export const latest = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const channel = String(req.query.channel ?? 'stable');
  const version = await prisma.pluginVersion.findFirst({
    where: { slug, channel, isLatest: true },
    orderBy: { publishedAt: 'desc' },
  });
  if (!version) throw new NotFoundError('No release found');
  return ok(res, version);
});

/** POST /plugins/check-update — plugin asks whether an update exists. */
export const checkUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { slug, currentVersion, channel } = req.body;
  const version = await prisma.pluginVersion.findFirst({
    where: { slug, channel, isLatest: true },
  });
  if (!version) return ok(res, { updateAvailable: false });
  return ok(res, {
    updateAvailable: version.version !== currentVersion,
    mandatory: version.isMandatory,
    latest: version,
  });
});

/** POST /plugins/:slug/download — record a download and return the asset URL. */
export const download = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const versionId = req.body?.versionId as string | undefined;
  const version = versionId
    ? await prisma.pluginVersion.findUnique({ where: { id: versionId } })
    : await prisma.pluginVersion.findFirst({ where: { slug, isLatest: true } });
  if (!version) throw new NotFoundError('Version not found');

  const userId = req.auth?.principal === 'user' ? req.auth.sub : undefined;
  await prisma.pluginDownload.create({
    data: { versionId: version.id, userId, ip: getClientIp(req) },
  });
  logActivity({ type: 'DOWNLOAD', userId, message: `${slug}@${version.version}` });

  return ok(res, { downloadUrl: version.downloadUrl, version: version.version, checksum: version.checksum });
});
