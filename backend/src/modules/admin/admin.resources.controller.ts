import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { asyncHandler, getClientIp, ok, parsePagination } from '../../utils/http';
import { serializeUser } from '../users/user.serializer';
import { audit } from '../../services/audit.service';
import { createNotification } from '../../services/notification.service';
import { NotFoundError } from '../../utils/errors';

// ───────────────────────── USERS ─────────────────────────

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const search = req.query.search ? String(req.query.search) : undefined;
  const where = search
    ? { OR: [{ username: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
    : {};
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.user.count({ where }),
  ]);
  return ok(res, items.map(serializeUser), { page, pageSize, total });
});

export const userDetail = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { licenses: true, devices: true, payments: true },
  });
  if (!user) throw new NotFoundError('User not found');
  return ok(res, { ...serializeUser(user), licenses: user.licenses, devices: user.devices, payments: user.payments });
});

export const setUserBan = asyncHandler(async (req: Request, res: Response) => {
  const isBanned = Boolean(req.body?.isBanned);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isBanned } });
  audit({ adminId: req.auth!.sub, action: isBanned ? 'USER_BAN' : 'USER_UNBAN', entity: 'User', entityId: user.id, ip: getClientIp(req) });
  return ok(res, serializeUser(user));
});

// ───────────────────────── DEVICES ─────────────────────────

export const listDevices = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    prisma.device.findMany({ orderBy: { lastSeenAt: 'desc' }, skip, take, include: { license: { select: { key: true } } } }),
    prisma.device.count(),
  ]);
  return ok(res, items, { page, pageSize, total });
});

export const resetDevice = asyncHandler(async (req: Request, res: Response) => {
  await prisma.device.delete({ where: { id: req.params.id } });
  audit({ adminId: req.auth!.sub, action: 'DEVICE_RESET', entity: 'Device', entityId: req.params.id, ip: getClientIp(req) });
  return ok(res, { reset: true });
});

// ───────────────────────── ANNOUNCEMENTS ─────────────────────────

const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  kind: z.enum(['NEWS', 'UPDATE', 'CHANGELOG', 'MAINTENANCE']).default('NEWS'),
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  coverUrl: z.string().url().optional(),
});

export const createAnnouncementSchema = announcementSchema;
export const updateAnnouncementSchema = announcementSchema.partial();

export const listAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.announcement.count(),
  ]);
  return ok(res, items, { page, pageSize, total });
});

export const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.announcement.create({ data: req.body });
  audit({ adminId: req.auth!.sub, action: 'ANNOUNCEMENT_CREATE', entity: 'Announcement', entityId: item.id, ip: getClientIp(req) });
  return ok(res, item, undefined, 201);
});

export const updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.announcement.update({ where: { id: req.params.id }, data: req.body });
  return ok(res, item);
});

export const deleteAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});

// ───────────────────────── PLUGIN VERSIONS ─────────────────────────

const pluginVersionSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  channel: z.string().default('stable'),
  releaseNotes: z.string().optional(),
  downloadUrl: z.string().url(),
  fileSizeBytes: z.coerce.number().int().min(0).default(0),
  checksum: z.string().optional(),
  minHostVersion: z.string().optional(),
  systemRequirements: z.record(z.unknown()).optional(),
  isLatest: z.boolean().default(true),
  isMandatory: z.boolean().default(false),
});

export const createPluginVersionSchema = pluginVersionSchema;

export const listPluginVersions = asyncHandler(async (_req: Request, res: Response) => {
  const items = await prisma.pluginVersion.findMany({ orderBy: { publishedAt: 'desc' } });
  return ok(res, items);
});

export const createPluginVersion = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof pluginVersionSchema>;
  // Only one "latest" per slug+channel.
  if (data.isLatest) {
    await prisma.pluginVersion.updateMany({
      where: { slug: data.slug, channel: data.channel },
      data: { isLatest: false },
    });
  }
  const item = await prisma.pluginVersion.create({
    data: { ...data, systemRequirements: data.systemRequirements as Prisma.InputJsonValue },
  });
  audit({ adminId: req.auth!.sub, action: 'PLUGIN_VERSION_CREATE', entity: 'PluginVersion', entityId: item.id, ip: getClientIp(req) });
  return ok(res, item, undefined, 201);
});

export const deletePluginVersion = asyncHandler(async (req: Request, res: Response) => {
  await prisma.pluginVersion.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});

// ───────────────────────── PROMO CODES ─────────────────────────

const promoSchema = z.object({
  code: z.string().min(3).max(40),
  type: z.enum(['PERCENT', 'FIXED', 'EXTEND_DAYS']),
  value: z.coerce.number().int().min(1),
  maxRedemptions: z.coerce.number().int().min(0).default(0),
  validUntil: z.coerce.date().optional(),
  appliesToTier: z.enum(['FREE', 'TRIAL', 'PRO', 'ULTIMATE']).optional(),
  isActive: z.boolean().default(true),
});

export const createPromoSchema = promoSchema;

export const listPromos = asyncHandler(async (_req: Request, res: Response) => {
  const items = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  return ok(res, items);
});

export const createPromo = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.promoCode.create({ data: { ...req.body, code: String(req.body.code).toUpperCase() } });
  audit({ adminId: req.auth!.sub, action: 'PROMO_CREATE', entity: 'PromoCode', entityId: item.id, ip: getClientIp(req) });
  return ok(res, item, undefined, 201);
});

export const deletePromo = asyncHandler(async (req: Request, res: Response) => {
  await prisma.promoCode.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});

// ───────────────────────── PAYMENTS / SUBSCRIPTIONS ─────────────────────────

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, skip, take, include: { user: { select: { username: true } } } }),
    prisma.payment.count(),
  ]);
  return ok(res, items, { page, pageSize, total });
});

export const listSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    prisma.subscription.findMany({ orderBy: { createdAt: 'desc' }, skip, take, include: { plan: true, user: { select: { username: true } } } }),
    prisma.subscription.count(),
  ]);
  return ok(res, items, { page, pageSize, total });
});

// ───────────────────────── AUDIT LOGS ─────────────────────────

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take, include: { admin: { select: { email: true } } } }),
    prisma.auditLog.count(),
  ]);
  return ok(res, items, { page, pageSize, total });
});

// ───────────────────────── BROADCAST ─────────────────────────

const broadcastSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  channel: z.enum(['IN_APP', 'TELEGRAM']).default('IN_APP'),
});

export const broadcastNotificationSchema = broadcastSchema;

export const broadcast = asyncHandler(async (req: Request, res: Response) => {
  const { title, body, channel } = req.body as z.infer<typeof broadcastSchema>;
  const users = await prisma.user.findMany({ where: { isBanned: false }, select: { id: true, telegramId: true } });
  let sent = 0;
  for (const user of users) {
    await createNotification({
      userId: user.id,
      type: 'ANNOUNCEMENT',
      title,
      body,
      channel,
      telegramId: user.telegramId,
    });
    sent++;
  }
  audit({ adminId: req.auth!.sub, action: 'BROADCAST', after: { sent }, ip: getClientIp(req) });
  return ok(res, { sent });
});
