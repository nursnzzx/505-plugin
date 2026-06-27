import type { User } from '@prisma/client';

export function serializeUser(user: User) {
  return {
    id: user.id,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User',
    avatarUrl: user.avatarUrl,
    languageCode: user.languageCode,
    country: user.country,
    city: user.city,
    timezone: user.timezone,
    email: user.email,
    isBanned: user.isBanned,
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
  };
}
