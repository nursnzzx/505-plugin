import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from './config';
import { mainMenu, cabinetButton } from './keyboards';
import { api } from './api';

const bot = new Telegraf(config.botToken);

// Track users awaiting key input after pressing "Activate Key".
const awaitingKey = new Set<number>();

const WELCOME = (name: string) =>
  `👋 <b>Welcome to KantTools, ${name}!</b>\n\n` +
  `Your licensing hub for After Effects & Premiere Pro plugins.\n\n` +
  `• Manage your license\n• Download plugins\n• Track devices & usage\n\n` +
  `Tap below to open your personal cabinet.`;

bot.start(async (ctx) => {
  awaitingKey.delete(ctx.from.id);
  await ctx.replyWithHTML(WELCOME(ctx.from.first_name ?? 'there'), mainMenu);
});

bot.help((ctx) =>
  ctx.replyWithHTML(
    `<b>KantTools commands</b>\n\n` +
      `/start — main menu\n` +
      `/profile — your account\n` +
      `/license — license status\n` +
      `/promo — redeem a promo code\n` +
      `/support — contact support\n` +
      `/help — this message`,
    mainMenu,
  ),
);

bot.command('profile', (ctx) =>
  ctx.replyWithHTML(
    `<b>👤 Your profile</b>\n\nID: <code>${ctx.from.id}</code>\nUsername: @${ctx.from.username ?? '—'}\n\nOpen the cabinet for full details.`,
    cabinetButton,
  ),
);

bot.command('license', (ctx) => {
  awaitingKey.add(ctx.from.id);
  return ctx.replyWithHTML('🔑 Send me your license key to check its status (e.g. <code>KT-PRO0-XXXX-...</code>).');
});

bot.command('promo', (ctx) =>
  ctx.replyWithHTML('🎁 Send your promo code in the cabinet to redeem it.', cabinetButton),
);

bot.command('support', (ctx) =>
  ctx.reply('Need help? Our team is one tap away.', Markup.inlineKeyboard([[Markup.button.url('💬 Contact support', config.supportUrl)]])),
);

bot.action('activate', async (ctx) => {
  awaitingKey.add(ctx.from!.id);
  await ctx.answerCbQuery();
  await ctx.replyWithHTML('🔑 Send me your license key to activate or check it.');
});

// Handle license-key text input.
bot.on(message('text'), async (ctx) => {
  const text = ctx.message.text.trim();
  if (!awaitingKey.has(ctx.from.id)) return;
  if (!/^KT-/i.test(text)) {
    await ctx.reply('That does not look like a KantTools key. It should start with "KT-".');
    return;
  }
  awaitingKey.delete(ctx.from.id);
  try {
    const lic = await api.licenseStatus(text.toUpperCase());
    const exp = lic.expiresAt ? new Date(lic.expiresAt).toDateString() : 'Lifetime';
    const remaining = lic.remaining ? `${lic.remaining.days}d ${lic.remaining.hours}h left` : '—';
    await ctx.replyWithHTML(
      `✅ <b>License found</b>\n\n` +
        `Tier: <b>${lic.tier}</b>\nStatus: <b>${lic.status}</b>\n` +
        `Expires: ${exp}\nRemaining: ${remaining}\n` +
        `Devices: ${lic.currentDevices}/${lic.maxDevices}`,
      cabinetButton,
    );
  } catch {
    await ctx.replyWithHTML('❌ Key not found. Double-check it or contact support.', cabinetButton);
  }
});

async function launch() {
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Open main menu' },
    { command: 'profile', description: 'Your account' },
    { command: 'license', description: 'Check license status' },
    { command: 'promo', description: 'Redeem a promo code' },
    { command: 'support', description: 'Contact support' },
    { command: 'help', description: 'Help' },
  ]);
  await bot.launch();
  // eslint-disable-next-line no-console
  console.log('🤖 KantTools bot is running');
}

void launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
