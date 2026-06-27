import { env } from '../config/env';
import { logger } from '../config/logger';

const API = (method: string) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

interface SendMessageOptions {
  parseMode?: 'HTML' | 'MarkdownV2';
  replyMarkup?: unknown;
  disablePreview?: boolean;
}

/** Sends a Telegram message via the Bot API. No-op if the token is unset. */
export async function sendTelegramMessage(
  chatId: bigint | string,
  text: string,
  opts: SendMessageOptions = {},
): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.debug('TELEGRAM_BOT_TOKEN unset — skipping Telegram notification');
    return false;
  }
  try {
    const res = await fetch(API('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
        parse_mode: opts.parseMode ?? 'HTML',
        disable_web_page_preview: opts.disablePreview ?? true,
        reply_markup: opts.replyMarkup,
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, body: await res.text() }, 'Telegram sendMessage failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, 'Telegram sendMessage error');
    return false;
  }
}
