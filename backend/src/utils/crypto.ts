import crypto from 'node:crypto';
import { env } from '../config/env';

/** Deterministic HMAC-SHA256 signature, hex encoded. */
export function hmac(payload: string, secret = env.LICENSE_SIGNING_SECRET): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
