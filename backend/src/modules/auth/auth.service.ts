import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { addDays } from '../../utils/time';
import { verifyTelegramInitData, type TelegramUser } from '../../utils/telegram-auth';
import { logActivity } from '../../services/activity.service';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';

interface TokenBundle {
  accessToken: string;
  refreshToken: string;
}

async function issueUserTokens(
  userId: string,
  telegramId: bigint,
  meta: { ip?: string; userAgent?: string },
): Promise<TokenBundle> {
  const accessToken = signAccessToken({
    sub: userId,
    principal: 'user',
    telegramId: telegramId.toString(),
  });
  const refreshToken = signRefreshToken({ sub: userId, principal: 'user' });
  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt: addDays(new Date(), 30),
    },
  });
  return { accessToken, refreshToken };
}

export const authService = {
  /** Authenticates a Telegram Mini App user from signed initData. */
  async loginWithTelegram(initData: string, meta: { ip?: string; userAgent?: string }) {
    const tgUser = verifyTelegramInitData(initData);
    if (!tgUser) throw new UnauthorizedError('Invalid Telegram initData');
    const user = await this.upsertTelegramUser(tgUser, meta.ip);
    const tokens = await issueUserTokens(user.id, user.telegramId, meta);
    logActivity({ type: 'LOGIN', userId: user.id, ip: meta.ip, message: 'Telegram Mini App' });
    return { user, ...tokens };
  },

  /** Dev/test login by raw Telegram id — disabled in production. */
  async loginDev(telegramId: bigint, meta: { ip?: string; userAgent?: string }) {
    if (env.isProd) throw new UnauthorizedError('Dev login disabled');
    const user = await this.upsertTelegramUser({ id: telegramId, username: `dev_${telegramId}` }, meta.ip);
    const tokens = await issueUserTokens(user.id, user.telegramId, meta);
    return { user, ...tokens };
  },

  async upsertTelegramUser(tg: TelegramUser, ip?: string) {
    return prisma.user.upsert({
      where: { telegramId: tg.id },
      create: {
        telegramId: tg.id,
        username: tg.username,
        firstName: tg.first_name,
        lastName: tg.last_name,
        avatarUrl: tg.photo_url,
        languageCode: tg.language_code ?? 'en',
        lastSeenAt: new Date(),
      },
      update: {
        username: tg.username,
        firstName: tg.first_name,
        lastName: tg.last_name,
        avatarUrl: tg.photo_url,
        lastSeenAt: new Date(),
        ...(ip ? {} : {}),
      },
    });
  },

  async refresh(refreshToken: string): Promise<TokenBundle & { principal: 'user' | 'admin' }> {
    let payload: { sub: string; principal: 'user' | 'admin' };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired');
    }

    // Rotate the refresh token.
    const newRefresh = signRefreshToken({ sub: payload.sub, principal: payload.principal });
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefresh, expiresAt: addDays(new Date(), 30) },
    });

    if (payload.principal === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
      if (!admin || !admin.isActive) throw new UnauthorizedError('Admin disabled');
      const accessToken = signAccessToken({ sub: admin.id, principal: 'admin', role: admin.role });
      return { accessToken, refreshToken: newRefresh, principal: 'admin' };
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.isBanned) throw new UnauthorizedError('User disabled');
    const accessToken = signAccessToken({
      sub: user.id,
      principal: 'user',
      telegramId: user.telegramId.toString(),
    });
    return { accessToken, refreshToken: newRefresh, principal: 'user' };
  },

  async logout(refreshToken: string) {
    await prisma.session.updateMany({
      where: { refreshToken },
      data: { revokedAt: new Date() },
    });
  },

  /** Admin email/password login. */
  async loginAdmin(email: string, password: string, meta: { ip?: string; userAgent?: string }) {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.isActive) throw new UnauthorizedError('Invalid credentials');
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const accessToken = signAccessToken({ sub: admin.id, principal: 'admin', role: admin.role });
    const refreshToken = signRefreshToken({ sub: admin.id, principal: 'admin' });
    await prisma.session.create({
      data: {
        adminId: admin.id,
        refreshToken,
        ip: meta.ip,
        userAgent: meta.userAgent,
        expiresAt: addDays(new Date(), 30),
      },
    });
    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    return {
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      accessToken,
      refreshToken,
    };
  },

  async createAdmin(email: string, password: string, name?: string) {
    if (password.length < 8) throw new BadRequestError('Password too short');
    const passwordHash = await bcrypt.hash(password, 12);
    return prisma.admin.create({ data: { email, passwordHash, name, role: 'ADMIN' } });
  },
};
