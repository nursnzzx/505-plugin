import type { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { asyncHandler, getClientIp, ok } from '../../utils/http';
import { serializeUser } from '../users/user.serializer';
import { BadRequestError } from '../../utils/errors';

const REFRESH_COOKIE = 'kt_refresh';
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function meta(req: Request) {
  return { ip: getClientIp(req), userAgent: req.headers['user-agent'] };
}

export const telegramLoginSchema = z.object({ initData: z.string().min(1) });
export const devLoginSchema = z.object({ telegramId: z.coerce.number() });
export const adminLoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const telegramLogin = asyncHandler(async (req: Request, res: Response) => {
  const { initData } = req.body;
  const result = await authService.loginWithTelegram(initData, meta(req));
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
  return ok(res, {
    user: serializeUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const devLogin = asyncHandler(async (req: Request, res: Response) => {
  const { telegramId } = req.body;
  const result = await authService.loginDev(BigInt(telegramId), meta(req));
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
  return ok(res, {
    user: serializeUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.loginAdmin(email, password, meta(req));
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
  return ok(res, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (!token) throw new BadRequestError('Missing refresh token');
  const result = await authService.refresh(token);
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
  return ok(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  return ok(res, { loggedOut: true });
});
