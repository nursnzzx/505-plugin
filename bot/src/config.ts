import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    // eslint-disable-next-line no-console
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

export const config = {
  botToken: required('TELEGRAM_BOT_TOKEN'),
  webAppUrl: process.env.TELEGRAM_WEBAPP_URL ?? 'http://localhost:3000',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000/api/v1',
  supportUrl: process.env.SUPPORT_URL ?? 'https://t.me/KantToolsSupport',
  communityUrl: process.env.COMMUNITY_URL ?? 'https://t.me/KantToolsCommunity',
};
