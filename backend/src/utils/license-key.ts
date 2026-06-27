import { customAlphabet } from 'nanoid';
import type { LicenseTier } from '@prisma/client';
import { hmac, timingSafeEqual } from './crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
const segment = customAlphabet(ALPHABET, 4);

const TIER_PREFIX: Record<LicenseTier, string> = {
  FREE: 'FREE',
  TRIAL: 'TRIA',
  PRO: 'PRO0',
  ULTIMATE: 'ULTI',
};

/** Generates a key like `KT-PRO0-XXXX-XXXX-XXXX-XXXX`. */
export function generateLicenseKey(tier: LicenseTier): string {
  const body = [TIER_PREFIX[tier], segment(), segment(), segment(), segment()].join('-');
  return `KT-${body}`;
}

/** Signs the immutable parts of a license for offline verification by the plugin. */
export function signLicense(input: {
  key: string;
  tier: LicenseTier;
  expiresAt: Date | null;
  maxDevices: number;
}): string {
  const payload = [input.key, input.tier, input.expiresAt?.toISOString() ?? 'never', input.maxDevices].join('|');
  return hmac(payload);
}

export function verifyLicenseSignature(
  input: { key: string; tier: LicenseTier; expiresAt: Date | null; maxDevices: number },
  signature: string,
): boolean {
  return timingSafeEqual(signLicense(input), signature);
}
