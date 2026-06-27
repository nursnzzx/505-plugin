import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import type { Application } from 'express';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { licenseRepository } from '../licenses/license.repository';
import { remainingUntil } from '../../utils/time';

const WEBHOOK_PATH = `${env.API_PREFIX}/telegram/webhook`;

let bot: Telegraf | null = null;
const awaitingKey = new Set<number>();

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.webApp('🏠 Personal Cabinet', env.TELEGRAM_WEBAPP_URL)],
    [
      Markup.button.webApp('⬇️ Download Plugin', `${env.TELEGRAM_WEBAPP_URL}/apps`),
      Markup.button.webApp('💎 Pricing', `${env.TELEGRAM_WEBAPP_URL}/apps`),
    ],
    [
      Markup.button.callback('🔑 Activate Key', 'activate'),
      Markup.button.webApp('📰 News', `${env.TELEGRAM_WEBAPP_URL}/news`),
    ],
    [Markup.button.url('💬 Support', env.SUPPORT_URL), Markup.button.url('🌐 Community', env.COMMUNITY_URL)],
  ]);
}

const cabinetButton = () =>
  Markup.inlineKeyboard([[Markup.button.webApp('🚀 Open Personal Cabinet', env.TELEGRAM_WEBAPP_URL)]]);

function buildBot(): Telegraf {
  const b = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  b.start(async (ctx) => {
    awaitingKey.delete(ctx.from.id);
    await ctx.replyWithHTML(
      `👋 <b>Welcome to Nurse 505, ${ctx.from.first_name ?? 'there'}!</b>\n\n` +
        `Your licensing hub for After Effects & Premiere Pro plugins.\n\n` +
        `• Manage your license\n• Download plugins\n• Track devices & usage\n\n` +
        `Tap below to open your personal cabinet.`,
      mainMenu(),
    );
  });

  b.help((ctx) =>
    ctx.replyWithHTML(
      `<b>Nurse 505 commands</b>\n\n/start — main menu\n/profile — your account\n/license — license status\n/promo — redeem a promo code\n/support — contact support\n/help — this message`,
      mainMenu(),
    ),
  );

  b.command('profile', (ctx) =>
    ctx.replyWithHTML(
      `<b>👤 Your profile</b>\n\nID: <code>${ctx.from.id}</code>\nUsername: @${ctx.from.username ?? '—'}\n\nOpen the cabinet for full details.`,
      cabinetButton(),
    ),
  );

  b.command('license', (ctx) => {
    awaitingKey.add(ctx.from.id);
    return ctx.replyWithHTML('🔑 Send me your license key to check its status (e.g. <code>KT-PRO0-XXXX-...</code>).');
  });

  b.command('promo', (ctx) => ctx.replyWithHTML('🎁 Open the cabinet to redeem a promo code.', cabinetButton()));

  b.command('support', (ctx) =>
    ctx.reply('Need help? Our team is one tap away.', Markup.inlineKeyboard([[Markup.button.url('💬 Contact support', env.SUPPORT_URL)]])),
  );

  b.action('activate', async (ctx) => {
    awaitingKey.add(ctx.from!.id);
    await ctx.answerCbQuery();
    await ctx.replyWithHTML('🔑 Send me your license key to activate or check it.');
  });

  b.on(message('text'), async (ctx) => {
    const text = ctx.message.text.trim();
    if (!awaitingKey.has(ctx.from.id)) return;
    if (!/^KT-/i.test(text)) {
      await ctx.reply('That does not look like a Nurse 505 key. It should start with "KT-".');
      return;
    }
    awaitingKey.delete(ctx.from.id);
    const license = await licenseRepository.findByKey(text.toUpperCase());
    if (!license) {
      await ctx.replyWithHTML('❌ Key not found. Double-check it or contact support.', cabinetButton());
      return;
    }
    const r = remainingUntil(license.expiresAt);
    const exp = license.expiresAt ? license.expiresAt.toDateString() : 'Lifetime';
    const remaining = r && !r.expired ? `${r.days}d ${r.hours}h left` : 'expired';
    await ctx.replyWithHTML(
      `✅ <b>License found</b>\n\nTier: <b>${license.tier}</b>\nStatus: <b>${license.status}</b>\n` +
        `Expires: ${exp}\nRemaining: ${remaining}\n` +
        `Devices: ${license.devices.filter((d) => d.isActive).length}/${license.maxDevices}`,
      cabinetButton(),
    );
  });

  return b;
}

export function isTelegramWebhookEnabled(): boolean {
  return Boolean(env.ENABLE_BOT_WEBHOOK && env.TELEGRAM_BOT_TOKEN && env.publicUrl);
}

/** Sync step: build the bot and mount its webhook route on the Express app. */
export function mountTelegramWebhook(app: Application): void {
  if (!isTelegramWebhookEnabled()) return;
  bot = buildBot();
  app.use(bot.webhookCallback(WEBHOOK_PATH));
}

/** Async step: register the webhook URL, commands, and menu button with Telegram. */
export async function registerTelegramWebhook(): Promise<void> {
  if (!bot) {
    logger.info('Telegram webhook disabled (set ENABLE_BOT_WEBHOOK, TELEGRAM_BOT_TOKEN, PUBLIC_URL)');
    return;
  }
  const url = `${env.publicUrl.replace(/\/$/, '')}${WEBHOOK_PATH}`;
  await bot.telegram.setWebhook(url);
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Open main menu' },
    { command: 'profile', description: 'Your account' },
    { command: 'license', description: 'Check license status' },
    { command: 'promo', description: 'Redeem a promo code' },
    { command: 'support', description: 'Contact support' },
    { command: 'help', description: 'Help' },
  ]);
  // Make the chat menu button open the Mini App.
  await bot.telegram.setChatMenuButton({
    menuButton: { type: 'web_app', text: 'Cabinet', web_app: { url: env.TELEGRAM_WEBAPP_URL } },
  });
  logger.info({ url }, '🤖 Telegram webhook registered');
}

export function getBot(): Telegraf | null {
  return bot;
}
