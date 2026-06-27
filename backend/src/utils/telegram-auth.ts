import crypto from 'node:crypto';
import { env } from '../config/env';

export interface TelegramUser {
  id: bigint;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
}

/**
 * Validates Telegram Mini App `initData` per the official spec:
 * the HMAC-SHA256 of the data-check-string, keyed by SHA256("WebAppData", botToken).
 */
export function verifyTelegramInitData(
  initData: string,
  maxAgeSeconds = 86_400,
): TelegramUser | null {
  if (!initData || !env.TELEGRAM_BOT_TOKEN) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(env.TELEGRAM_BOT_TOKEN).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computed.length !== hash.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) return null;

  const authDate = Number(params.get('auth_date') ?? 0);
  if (maxAgeSeconds > 0 && authDate > 0) {
    const age = Math.floor(Date.now() / 1000) - authDate;
    if (age > maxAgeSeconds) return null;
  }

  const userRaw = params.get('user');
  if (!userRaw) return null;

  try {
    const parsed = JSON.parse(userRaw) as Record<string, unknown>;
    return {
      id: BigInt(parsed.id as number),
      username: parsed.username as string | undefined,
      first_name: parsed.first_name as string | undefined,
      last_name: parsed.last_name as string | undefined,
      photo_url: parsed.photo_url as string | undefined,
      language_code: parsed.language_code as string | undefined,
    };
  } catch {
    return null;
  }
}

/** Verifies the legacy Telegram Login Widget payload (used by bot deep-links). */
export function verifyTelegramLoginWidget(data: Record<string, string>): boolean {
  if (!env.TELEGRAM_BOT_TOKEN) return false;
  const { hash, ...rest } = data;
  if (!hash) return false;
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n');
  const secret = crypto.createHash('sha256').update(env.TELEGRAM_BOT_TOKEN).digest();
  const computed = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  return computed === hash;
}
