import type { Request, Response } from 'express';
import { z } from 'zod';
import type { LicenseStatus, LicenseTier } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { licenseService } from '../licenses/license.service';
import { licenseRepository } from '../licenses/license.repository';
import { serializeLicense } from '../licenses/license.serializer';
import { asyncHandler, getClientIp, ok, parsePagination } from '../../utils/http';
import { audit } from '../../services/audit.service';
import { BadRequestError, NotFoundError } from '../../utils/errors';

const tier = z.enum(['FREE', 'TRIAL', 'PRO', 'ULTIMATE']);

export const generateSchema = z.object({
  tier,
  count: z.coerce.number().int().min(1).max(1000).default(1),
  durationDays: z.coerce.number().int().min(0).max(3650).optional(),
  maxDevices: z.coerce.number().int().min(1).max(100).optional(),
  userId: z.string().cuid().optional(),
  planId: z.string().cuid().optional(),
  notes: z.string().max(500).optional(),
});

export const transitionSchema = z.object({
  status: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'TRIAL', 'PENDING', 'BLOCKED']),
});

/** GET /admin/licenses?status=&tier=&search=&page= */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total] = await licenseRepository.list({
    skip,
    take,
    status: req.query.status as LicenseStatus | undefined,
    tier: req.query.tier as LicenseTier | undefined,
    search: req.query.search ? String(req.query.search) : undefined,
  });
  return ok(res, items.map(serializeLicense), { page, pageSize, total });
});

/** GET /admin/licenses/:id */
export const detail = asyncHandler(async (req: Request, res: Response) => {
  const license = await licenseRepository.findById(req.params.id);
  if (!license) throw new NotFoundError('License not found');
  const history = await licenseService.getHistory(license.id);
  return ok(res, { license: serializeLicense(license), history });
});

/** POST /admin/licenses/generate — single or bulk. */
export const generate = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as z.infer<typeof generateSchema>;
  const created = [];
  for (let i = 0; i < input.count; i++) {
    const license = await licenseService.createLicense({
      tier: input.tier,
      userId: input.userId,
      planId: input.planId,
      durationDays: input.durationDays,
      maxDevices: input.maxDevices,
      notes: input.notes,
      actor: { type: 'ADMIN', id: req.auth!.sub },
    });
    created.push(license);
  }
  audit({
    adminId: req.auth!.sub,
    action: 'LICENSE_GENERATE',
    entity: 'License',
    after: { tier: input.tier, count: input.count },
    ip: getClientIp(req),
  });
  return ok(res, { count: created.length, licenses: created.map(serializeLicense) }, undefined);
});

/** GET /admin/licenses/export.csv */
export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const [items] = await licenseRepository.list({
    skip: 0,
    take: 10000,
    status: req.query.status as LicenseStatus | undefined,
    tier: req.query.tier as LicenseTier | undefined,
  });
  const header = 'key,tier,status,maxDevices,activationCount,issuedAt,expiresAt';
  const rows = items.map((l) =>
    [
      l.key,
      l.tier,
      l.status,
      l.maxDevices,
      l.activationCount,
      l.issuedAt.toISOString(),
      l.expiresAt?.toISOString() ?? '',
    ].join(','),
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="licenses.csv"');
  res.send([header, ...rows].join('\n'));
});

/** POST /admin/licenses/:id/status — suspend / revoke / activate etc. */
export const transition = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as z.infer<typeof transitionSchema>;
  const updated = await licenseService.transition(req.params.id, status, `ADMIN_${status}`, {
    type: 'ADMIN',
    id: req.auth!.sub,
  });
  audit({
    adminId: req.auth!.sub,
    action: 'LICENSE_TRANSITION',
    entity: 'License',
    entityId: req.params.id,
    after: { status },
    ip: getClientIp(req),
  });
  return ok(res, serializeLicense(updated));
});

/** POST /admin/licenses/:id/renew */
export const renew = asyncHandler(async (req: Request, res: Response) => {
  const days = Number(req.body?.days);
  if (!days || days < 1) throw new BadRequestError('days must be >= 1');
  const updated = await licenseService.renew(req.params.id, days, { type: 'ADMIN', id: req.auth!.sub });
  return ok(res, serializeLicense(updated));
});

/** DELETE /admin/licenses/:id */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.license.delete({ where: { id: req.params.id } });
  audit({
    adminId: req.auth!.sub,
    action: 'LICENSE_DELETE',
    entity: 'License',
    entityId: req.params.id,
    ip: getClientIp(req),
  });
  return ok(res, { deleted: true });
});
