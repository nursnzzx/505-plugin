import type { DevicePlatform, LicenseStatus, LicenseTier } from '@prisma/client';
import { env } from '../../config/env';
import { licenseRepository } from './license.repository';
import { deviceRepository } from '../devices/device.repository';
import { generateLicenseKey, signLicense } from '../../utils/license-key';
import { addDays, remainingUntil } from '../../utils/time';
import { logActivity } from '../../services/activity.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';

const ACTIVE_STATES: LicenseStatus[] = ['ACTIVE', 'TRIAL'];

export interface DeviceFingerprint {
  hardwareId: string;
  platform?: DevicePlatform;
  os?: string;
  cpu?: string;
  motherboardId?: string;
  diskId?: string;
  machineName?: string;
  pluginVersion?: string;
  ip?: string;
  country?: string;
  city?: string;
  timezone?: string;
}

interface CreateLicenseOptions {
  tier: LicenseTier;
  userId?: string;
  planId?: string;
  durationDays?: number | null; // null = lifetime
  maxDevices?: number;
  status?: LicenseStatus;
  notes?: string;
  actor?: { type: string; id?: string };
}

const DEFAULT_MAX_DEVICES: Record<LicenseTier, number> = {
  FREE: 1,
  TRIAL: 1,
  PRO: 2,
  ULTIMATE: 5,
};

const DEFAULT_DURATION_DAYS: Record<LicenseTier, number | null> = {
  FREE: null,
  TRIAL: env.TRIAL_DURATION_DAYS,
  PRO: 30,
  ULTIMATE: 365,
};

export const licenseService = {
  /** Issues a brand-new license with a signed key. */
  async createLicense(opts: CreateLicenseOptions) {
    const maxDevices = opts.maxDevices ?? DEFAULT_MAX_DEVICES[opts.tier];
    const durationDays =
      opts.durationDays === undefined ? DEFAULT_DURATION_DAYS[opts.tier] : opts.durationDays;
    const expiresAt = durationDays ? addDays(new Date(), durationDays) : null;
    const key = generateLicenseKey(opts.tier);
    const signature = signLicense({ key, tier: opts.tier, expiresAt, maxDevices });

    const license = await licenseRepository.create({
      key,
      tier: opts.tier,
      status: opts.status ?? (opts.tier === 'TRIAL' ? 'TRIAL' : 'PENDING'),
      signature,
      maxDevices,
      expiresAt,
      notes: opts.notes,
      ...(opts.userId ? { user: { connect: { id: opts.userId } } } : {}),
      ...(opts.planId ? { plan: { connect: { id: opts.planId } } } : {}),
    });

    await licenseRepository.addHistory({
      licenseId: license.id,
      action: 'CREATED',
      toStatus: license.status,
      actorType: opts.actor?.type ?? 'SYSTEM',
      actorId: opts.actor?.id,
    });

    return license;
  },

  /**
   * Binds a license to a device. Enforces device caps and device-change limits.
   * Creates/links the user-owned license on first activation.
   */
  async activate(key: string, device: DeviceFingerprint, userId?: string) {
    const license = await licenseRepository.findByKey(key);
    if (!license) throw new NotFoundError('License key not found');

    if (license.status === 'REVOKED' || license.status === 'BLOCKED') {
      throw new ForbiddenError(`License is ${license.status.toLowerCase()}`);
    }

    const remaining = remainingUntil(license.expiresAt);
    if (remaining?.expired) {
      await this.transition(license.id, 'EXPIRED', 'EXPIRED_ON_ACTIVATE', { type: 'SYSTEM' });
      throw new ForbiddenError('License has expired');
    }

    // Claim an unowned license for the activating user.
    if (!license.userId && userId) {
      await licenseRepository.update(license.id, { user: { connect: { id: userId } } });
    } else if (license.userId && userId && license.userId !== userId) {
      throw new ForbiddenError('License is bound to a different account');
    }

    const existing = await deviceRepository.findByLicenseAndHardware(license.id, device.hardwareId);

    if (existing) {
      await deviceRepository.update(existing.id, {
        isActive: true,
        lastSeenAt: new Date(),
        ...sanitizeDevice(device),
      });
    } else {
      const activeCount = await deviceRepository.countActive(license.id);
      if (activeCount >= license.maxDevices) {
        if (license.deviceChanges >= env.DEVICE_CHANGE_LIMIT) {
          throw new ConflictError(
            'Device limit reached and no device changes remaining. Contact support.',
          );
        }
        // Consume a device change: deactivate the oldest device.
        const devices = await deviceRepository.listForLicense(license.id);
        const oldest = devices.filter((d) => d.isActive).sort((a, b) =>
          (a.lastSeenAt?.getTime() ?? 0) - (b.lastSeenAt?.getTime() ?? 0),
        )[0];
        if (oldest) await deviceRepository.deactivate(oldest.id);
        await licenseRepository.update(license.id, { deviceChanges: { increment: 1 } });
      }

      await deviceRepository.create({
        licenseId: license.id,
        userId: license.userId ?? userId ?? null,
        hardwareId: device.hardwareId,
        lastSeenAt: new Date(),
        ...sanitizeDevice(device),
      });
    }

    const nextStatus: LicenseStatus = license.tier === 'TRIAL' ? 'TRIAL' : 'ACTIVE';
    const updated = await licenseRepository.update(license.id, {
      status: nextStatus,
      activationCount: { increment: 1 },
      activatedAt: license.activatedAt ?? new Date(),
      lastOnlineAt: new Date(),
      pluginVersion: device.pluginVersion ?? license.pluginVersion,
    });

    await licenseRepository.addHistory({
      licenseId: license.id,
      action: 'ACTIVATED',
      fromStatus: license.status,
      toStatus: nextStatus,
      meta: { hardwareId: device.hardwareId },
      actorType: 'USER',
      actorId: userId,
    });

    logActivity({
      type: 'ACTIVATE',
      userId: license.userId ?? userId,
      licenseId: license.id,
      message: `Activated on ${device.machineName ?? device.hardwareId}`,
      ip: device.ip,
    });

    return updated;
  },

  /** Stateless verification used by the desktop plugin on every launch / heartbeat. */
  async verify(key: string, hardwareId: string, pluginVersion?: string) {
    const license = await licenseRepository.findByKey(key);
    if (!license) throw new NotFoundError('License key not found');

    const device = await deviceRepository.findByLicenseAndHardware(license.id, hardwareId);
    const deviceBound = Boolean(device?.isActive);

    const remaining = remainingUntil(license.expiresAt);
    if (remaining?.expired && ACTIVE_STATES.includes(license.status)) {
      await this.transition(license.id, 'EXPIRED', 'EXPIRED', { type: 'SYSTEM' });
      license.status = 'EXPIRED';
    }

    // Touch online markers.
    await licenseRepository.update(license.id, {
      lastOnlineAt: new Date(),
      ...(pluginVersion ? { pluginVersion } : {}),
    });
    if (device) {
      await deviceRepository.update(device.id, {
        lastSeenAt: new Date(),
        ...(pluginVersion ? { pluginVersion } : {}),
      });
    }

    return { license: await licenseRepository.findById(license.id), deviceBound };
  },

  /** Heartbeat — lightweight touch + activity log. */
  async heartbeat(key: string, hardwareId: string, pluginVersion?: string) {
    const result = await this.verify(key, hardwareId, pluginVersion);
    logActivity({
      type: 'HEARTBEAT',
      userId: result.license?.userId,
      licenseId: result.license?.id,
      message: hardwareId,
    });
    return result;
  },

  async deactivateDevice(key: string, hardwareId: string, userId?: string) {
    const license = await licenseRepository.findByKey(key);
    if (!license) throw new NotFoundError('License key not found');
    if (userId && license.userId && license.userId !== userId) {
      throw new ForbiddenError('Not your license');
    }
    const device = await deviceRepository.findByLicenseAndHardware(license.id, hardwareId);
    if (!device) throw new NotFoundError('Device not bound to this license');
    await deviceRepository.deactivate(device.id);
    await licenseRepository.addHistory({
      licenseId: license.id,
      action: 'DEVICE_REMOVED',
      meta: { hardwareId },
      actorType: userId ? 'USER' : 'SYSTEM',
      actorId: userId,
    });
    logActivity({ type: 'DEVICE_REMOVED', userId: license.userId, licenseId: license.id });
    return device;
  },

  async renew(licenseId: string, days: number, actor?: { type: string; id?: string }) {
    const license = await licenseRepository.findById(licenseId);
    if (!license) throw new NotFoundError('License not found');
    if (days <= 0) throw new BadRequestError('Renewal days must be positive');

    const base = license.expiresAt && license.expiresAt > new Date() ? license.expiresAt : new Date();
    const expiresAt = addDays(base, days);
    const signature = signLicense({
      key: license.key,
      tier: license.tier,
      expiresAt,
      maxDevices: license.maxDevices,
    });

    const updated = await licenseRepository.update(licenseId, {
      expiresAt,
      signature,
      status: license.tier === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
    });
    await licenseRepository.addHistory({
      licenseId,
      action: 'RENEWED',
      toStatus: updated.status,
      meta: { days, expiresAt: expiresAt.toISOString() },
      actorType: actor?.type ?? 'USER',
      actorId: actor?.id,
    });
    logActivity({ type: 'RENEW', userId: license.userId, licenseId, message: `+${days} days` });
    return updated;
  },

  async transition(
    licenseId: string,
    to: LicenseStatus,
    action: string,
    actor?: { type: string; id?: string },
  ) {
    const license = await licenseRepository.findById(licenseId);
    if (!license) throw new NotFoundError('License not found');
    const updated = await licenseRepository.update(licenseId, { status: to });
    await licenseRepository.addHistory({
      licenseId,
      action,
      fromStatus: license.status,
      toStatus: to,
      actorType: actor?.type ?? 'ADMIN',
      actorId: actor?.id,
    });
    return updated;
  },

  getHistory(licenseId: string) {
    return licenseRepository.history(licenseId);
  },
};

function sanitizeDevice(d: DeviceFingerprint) {
  return {
    platform: d.platform ?? 'UNKNOWN',
    os: d.os,
    cpu: d.cpu,
    motherboardId: d.motherboardId,
    diskId: d.diskId,
    machineName: d.machineName,
    pluginVersion: d.pluginVersion,
    ip: d.ip,
    country: d.country,
    city: d.city,
    timezone: d.timezone,
  };
}
