import type { RequestHandler } from 'express';
import type { AdminRole } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

function extractToken(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** Requires a valid access token of any principal. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req.headers.authorization);
  if (!token) return next(new UnauthorizedError('Missing bearer token'));
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      principal: payload.principal,
      sub: payload.sub,
      telegramId: payload.telegramId,
      role: payload.role,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

/** Requires the principal to be a regular user. */
export const requireUser: RequestHandler = (req, _res, next) => {
  if (req.auth?.principal !== 'user') return next(new ForbiddenError('User access required'));
  next();
};

/** Requires admin principal, optionally with one of the given roles. */
export function requireAdmin(...roles: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    if (req.auth?.principal !== 'admin') return next(new ForbiddenError('Admin access required'));
    if (roles.length && !roles.includes(req.auth.role as AdminRole)) {
      return next(new ForbiddenError('Insufficient role'));
    }
    next();
  };
}

/** Optional auth: attaches req.auth when a valid token is present, never rejects. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req.headers.authorization);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.auth = {
        principal: payload.principal,
        sub: payload.sub,
        telegramId: payload.telegramId,
        role: payload.role,
      };
    } catch {
      /* ignore */
    }
  }
  next();
};
