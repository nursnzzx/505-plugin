import type { LicenseStatus, LicenseTier, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';

const withRelations = {
  plan: true,
  devices: true,
  user: true,
} satisfies Prisma.LicenseInclude;

export const licenseRepository = {
  findByKey(key: string) {
    return prisma.license.findUnique({ where: { key }, include: withRelations });
  },

  findById(id: string) {
    return prisma.license.findUnique({ where: { id }, include: withRelations });
  },

  findForUser(userId: string) {
    return prisma.license.findMany({
      where: { userId },
      include: withRelations,
      orderBy: { createdAt: 'desc' },
    });
  },

  findActiveForUser(userId: string) {
    return prisma.license.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: withRelations,
      orderBy: { createdAt: 'desc' },
    });
  },

  create(data: Prisma.LicenseCreateInput) {
    return prisma.license.create({ data, include: withRelations });
  },

  update(id: string, data: Prisma.LicenseUpdateInput) {
    return prisma.license.update({ where: { id }, data, include: withRelations });
  },

  history(licenseId: string) {
    return prisma.licenseHistory.findMany({
      where: { licenseId },
      orderBy: { createdAt: 'desc' },
    });
  },

  addHistory(data: Prisma.LicenseHistoryUncheckedCreateInput) {
    return prisma.licenseHistory.create({ data });
  },

  list(params: {
    skip: number;
    take: number;
    status?: LicenseStatus;
    tier?: LicenseTier;
    search?: string;
  }) {
    const where: Prisma.LicenseWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.tier ? { tier: params.tier } : {}),
      ...(params.search
        ? {
            OR: [
              { key: { contains: params.search, mode: 'insensitive' } },
              { user: { username: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return prisma.$transaction([
      prisma.license.findMany({
        where,
        include: withRelations,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.license.count({ where }),
    ]);
  },
};

export type LicenseWithRelations = Prisma.LicenseGetPayload<{ include: typeof withRelations }>;
