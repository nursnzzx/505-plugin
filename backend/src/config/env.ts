import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  APP_URL: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  LICENSE_SIGNING_SECRET: z.string().min(16),

  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_BOT_USERNAME: z.string().default('Nurse505Bot'),
  TELEGRAM_WEBAPP_URL: z.string().default('http://localhost:3000'),
  TELEGRAM_ADMIN_IDS: z.string().default(''),

  // Public URL of THIS backend (used to register the Telegram webhook in prod).
  PUBLIC_URL: z.string().default(''),
  // When true, the bot runs in-process via webhook (single free service on Render).
  ENABLE_BOT_WEBHOOK: z.coerce.boolean().default(false),
  SUPPORT_URL: z.string().default('https://t.me/'),
  COMMUNITY_URL: z.string().default('https://t.me/'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),

  DEVICE_CHANGE_LIMIT: z.coerce.number().default(3),
  TRIAL_DURATION_DAYS: z.coerce.number().default(7),

  ADMIN_EMAIL: z.string().default('admin@kanttools.local'),
  ADMIN_PASSWORD: z.string().default('ChangeMe123!'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

// Normalize a URL-ish env value into a fully-qualified URL (https + no trailing slash).
// Render's `fromService.property: host` gives bare hosts like "foo.onrender.com" —
// Telegram and our API client both need a scheme, so we add one if missing.
function toUrl(value: string, fallback = ''): string {
  const v = (value || '').trim();
  if (!v) return fallback;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return withScheme.replace(/\/+$/, '');
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isDev: raw.NODE_ENV === 'development',
  // Render injects RENDER_EXTERNAL_URL automatically; use it when PUBLIC_URL is unset.
  publicUrl: toUrl(raw.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || ''),
  // Telegram requires HTTPS; auto-add scheme if Render passed only the host.
  TELEGRAM_WEBAPP_URL: toUrl(raw.TELEGRAM_WEBAPP_URL, 'http://localhost:3000'),
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => toUrl(s, s)),
  telegramAdminIds: raw.TELEGRAM_ADMIN_IDS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => BigInt(s)),
};

export type Env = typeof env;
