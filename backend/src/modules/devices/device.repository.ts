import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';

export const deviceRepository = {
  findByLicenseAndHardware(licenseId: string, hardwareId: string) {
    return prisma.device.findUnique({
      where: { licenseId_hardwareId: { licenseId, hardwareId } },
    });
  },

  findById(id: string) {
    return prisma.device.findUnique({ where: { id } });
  },

  listForLicense(licenseId: string) {
    return prisma.device.findMany({ where: { licenseId }, orderBy: { lastSeenAt: 'desc' } });
  },

  countActive(licenseId: string) {
    return prisma.device.count({ where: { licenseId, isActive: true } });
  },

  create(data: Prisma.DeviceUncheckedCreateInput) {
    return prisma.device.create({ data });
  },

  update(id: string, data: Prisma.DeviceUpdateInput) {
    return prisma.device.update({ where: { id }, data });
  },

  deactivate(id: string) {
    return prisma.device.update({ where: { id }, data: { isActive: false } });
  },

  remove(id: string) {
    return prisma.device.delete({ where: { id } });
  },
};
