import type { ActivityType, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { logger } from '../config/logger';

interface LogActivityInput {
  type: ActivityType;
  userId?: string | null;
  licenseId?: string | null;
  message?: string;
  meta?: Prisma.InputJsonValue;
  ip?: string;
}

/** Fire-and-forget activity logging — never blocks the request path. */
export function logActivity(input: LogActivityInput): void {
  prisma.activity
    .create({
      data: {
        type: input.type,
        userId: input.userId ?? undefined,
        licenseId: input.licenseId ?? undefined,
        message: input.message,
        meta: input.meta,
        ip: input.ip,
      },
    })
    .catch((err) => logger.warn({ err }, 'Failed to write activity log'));
}
