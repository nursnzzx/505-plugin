import type { LicenseWithRelations } from './license.repository';
import { lifecycleProgress, remainingUntil } from '../../utils/time';
import { verifyLicenseSignature } from '../../utils/license-key';

export function serializeLicense(license: LicenseWithRelations) {
  const remaining = remainingUntil(license.expiresAt);
  return {
    id: license.id,
    key: license.key,
    tier: license.tier,
    status: license.status,
    maxDevices: license.maxDevices,
    currentDevices: license.devices.filter((d) => d.isActive).length,
    activationCount: license.activationCount,
    deviceChanges: license.deviceChanges,
    pluginVersion: license.pluginVersion,
    issuedAt: license.issuedAt,
    activatedAt: license.activatedAt,
    expiresAt: license.expiresAt,
    lastOnlineAt: license.lastOnlineAt,
    remaining,
    progress: lifecycleProgress(license.issuedAt, license.expiresAt),
    signatureValid: verifyLicenseSignature(
      {
        key: license.key,
        tier: license.tier,
        expiresAt: license.expiresAt,
        maxDevices: license.maxDevices,
      },
      license.signature,
    ),
    plan: license.plan
      ? { id: license.plan.id, code: license.plan.code, name: license.plan.name }
      : null,
  };
}

/** Compact response for the desktop plugin's verify call. */
export function serializeVerification(license: LicenseWithRelations, deviceBound: boolean) {
  const remaining = remainingUntil(license.expiresAt);
  return {
    valid: ['ACTIVE', 'TRIAL'].includes(license.status) && !remaining?.expired,
    status: license.status,
    tier: license.tier,
    deviceBound,
    expiresAt: license.expiresAt,
    remainingDays: remaining?.days ?? null,
    remainingHours: remaining?.hours ?? null,
    maxDevices: license.maxDevices,
    currentDevices: license.devices.filter((d) => d.isActive).length,
    signature: license.signature,
  };
}
