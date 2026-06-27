import type { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { logger } from '../config/logger';

interface AuditInput {
  adminId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}

export function audit(input: AuditInput): void {
  prisma.auditLog
    .create({
      data: {
        adminId: input.adminId ?? undefined,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        before: input.before,
        after: input.after,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    })
    .catch((err) => logger.warn({ err }, 'Failed to write audit log'));
}
