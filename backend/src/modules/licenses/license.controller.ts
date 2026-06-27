import type { Request, Response } from 'express';
import { licenseService } from './license.service';
import { licenseRepository } from './license.repository';
import { deviceRepository } from '../devices/device.repository';
import { serializeLicense, serializeVerification } from './license.serializer';
import { asyncHandler, getClientIp, ok } from '../../utils/http';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';

/** POST /license/activate */
export const activate = asyncHandler(async (req: Request, res: Response) => {
  const { key, device } = req.body;
  const ip = getClientIp(req);
  const userId = req.auth?.principal === 'user' ? req.auth.sub : undefined;
  const license = await licenseService.activate(key, { ...device, ip: device.ip ?? ip }, userId);
  return ok(res, serializeLicense(license));
});

/** POST /license/verify */
export const verify = asyncHandler(async (req: Request, res: Response) => {
  const { key, hardwareId, pluginVersion } = req.body;
  const { license, deviceBound } = await licenseService.verify(key, hardwareId, pluginVersion);
  if (!license) throw new NotFoundError('License not found');
  return ok(res, serializeVerification(license, deviceBound));
});

/** POST /license/heartbeat */
export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  const { key, hardwareId, pluginVersion } = req.body;
  const { license, deviceBound } = await licenseService.heartbeat(key, hardwareId, pluginVersion);
  if (!license) throw new NotFoundError('License not found');
  return ok(res, serializeVerification(license, deviceBound));
});

/** POST /license/deactivate */
export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const { key, hardwareId } = req.body;
  const userId = req.auth?.principal === 'user' ? req.auth.sub : undefined;
  await licenseService.deactivateDevice(key, hardwareId, userId);
  return ok(res, { deactivated: true });
});

/** GET /license/me — current user's active license (+ all licenses). */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const licenses = await licenseRepository.findForUser(userId);
  const active = licenses.find((l) => ['ACTIVE', 'TRIAL'].includes(l.status)) ?? licenses[0] ?? null;
  return ok(res, {
    active: active ? serializeLicense(active) : null,
    all: licenses.map(serializeLicense),
  });
});

/** GET /license/status?key=... */
export const status = asyncHandler(async (req: Request, res: Response) => {
  const key = String(req.query.key);
  const license = await licenseRepository.findByKey(key);
  if (!license) throw new NotFoundError('License not found');
  return ok(res, serializeLicense(license));
});

/** GET /license/history?key=... or licenseId */
export const history = asyncHandler(async (req: Request, res: Response) => {
  const key = req.query.key ? String(req.query.key) : undefined;
  const licenseId = req.query.licenseId ? String(req.query.licenseId) : undefined;
  const license = key
    ? await licenseRepository.findByKey(key)
    : licenseId
      ? await licenseRepository.findById(licenseId)
      : null;
  if (!license) throw new NotFoundError('License not found');
  if (req.auth?.principal === 'user' && license.userId !== req.auth.sub) {
    throw new ForbiddenError('Not your license');
  }
  const items = await licenseService.getHistory(license.id);
  return ok(res, items);
});

/** GET /license/devices?key=... */
export const devices = asyncHandler(async (req: Request, res: Response) => {
  const key = String(req.query.key);
  const license = await licenseRepository.findByKey(key);
  if (!license) throw new NotFoundError('License not found');
  if (req.auth?.principal === 'user' && license.userId !== req.auth.sub) {
    throw new ForbiddenError('Not your license');
  }
  const list = await deviceRepository.listForLicense(license.id);
  return ok(res, list);
});

/** DELETE /license/device */
export const removeDevice = asyncHandler(async (req: Request, res: Response) => {
  const { key, hardwareId } = req.body;
  const userId = req.auth?.principal === 'user' ? req.auth.sub : undefined;
  await licenseService.deactivateDevice(key, hardwareId, userId);
  return ok(res, { removed: true });
});

/** POST /license/renew */
export const renew = asyncHandler(async (req: Request, res: Response) => {
  const { licenseId, key, days } = req.body;
  let id = licenseId as string | undefined;
  if (!id && key) {
    const license = await licenseRepository.findByKey(key);
    if (!license) throw new NotFoundError('License not found');
    id = license.id;
  }
  if (!id) throw new BadRequestError('licenseId or key is required');

  if (req.auth?.principal === 'user') {
    const license = await licenseRepository.findById(id);
    if (license?.userId !== req.auth.sub) throw new ForbiddenError('Not your license');
  }

  const actor =
    req.auth?.principal === 'admin'
      ? { type: 'ADMIN', id: req.auth.sub }
      : { type: 'USER', id: req.auth?.sub };
  const updated = await licenseService.renew(id, days, actor);
  return ok(res, serializeLicense(updated));
});
