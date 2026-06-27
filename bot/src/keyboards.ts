import { Markup } from 'telegraf';
import { config } from './config';

export const mainMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('🏠 Personal Cabinet', config.webAppUrl)],
  [
    Markup.button.webApp('⬇️ Download Plugin', `${config.webAppUrl}/apps`),
    Markup.button.webApp('💎 Pricing', `${config.webAppUrl}/apps`),
  ],
  [
    Markup.button.callback('🔑 Activate Key', 'activate'),
    Markup.button.webApp('📰 News', `${config.webAppUrl}/news`),
  ],
  [
    Markup.button.url('💬 Support', config.supportUrl),
    Markup.button.url('🌐 Community', config.communityUrl),
  ],
]);

export const cabinetButton = Markup.inlineKeyboard([
  [Markup.button.webApp('🚀 Open Personal Cabinet', config.webAppUrl)],
]);
