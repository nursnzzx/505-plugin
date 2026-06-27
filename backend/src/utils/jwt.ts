import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type Principal = 'user' | 'admin';

export interface AccessTokenPayload {
  sub: string;
  principal: Principal;
  telegramId?: string;
  role?: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: { sub: string; principal: Principal }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string; principal: Principal } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; principal: Principal };
}
