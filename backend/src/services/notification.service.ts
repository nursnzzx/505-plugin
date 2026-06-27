import type { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { logger } from '../config/logger';
import { sendTelegramMessage } from './telegram-notify.service';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  channel?: NotificationChannel;
  meta?: Prisma.InputJsonValue;
  telegramId?: bigint;
}

/**
 * Persists an in-app notification and, when channel is TELEGRAM, also delivers
 * it through the bot. Returns the created record.
 */
export async function createNotification(input: CreateNotificationInput) {
  const channel = input.channel ?? 'IN_APP';
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      channel,
      title: input.title,
      body: input.body,
      meta: input.meta,
      sentAt: channel === 'IN_APP' ? new Date() : null,
    },
  });

  if (channel === 'TELEGRAM' && input.telegramId) {
    const sent = await sendTelegramMessage(
      input.telegramId,
      `<b>${input.title}</b>\n${input.body}`,
    );
    if (sent) {
      await prisma.notification
        .update({ where: { id: notification.id }, data: { sentAt: new Date() } })
        .catch((err) => logger.warn({ err }, 'Failed to mark notification sent'));
    }
  }

  return notification;
}

export async function markNotificationRead(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
