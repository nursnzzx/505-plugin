import { z } from 'zod';

export const deviceFingerprintSchema = z.object({
  hardwareId: z.string().min(4).max(256),
  platform: z.enum(['WINDOWS', 'MACOS', 'LINUX', 'UNKNOWN']).optional(),
  os: z.string().max(128).optional(),
  cpu: z.string().max(128).optional(),
  motherboardId: z.string().max(128).optional(),
  diskId: z.string().max(128).optional(),
  machineName: z.string().max(128).optional(),
  pluginVersion: z.string().max(32).optional(),
  ip: z.string().max(64).optional(),
  country: z.string().max(64).optional(),
  city: z.string().max(64).optional(),
  timezone: z.string().max(64).optional(),
});

export const activateSchema = z.object({
  key: z.string().min(8).max(64),
  device: deviceFingerprintSchema,
});

export const verifySchema = z.object({
  key: z.string().min(8).max(64),
  hardwareId: z.string().min(4).max(256),
  pluginVersion: z.string().max(32).optional(),
});

export const deactivateSchema = z.object({
  key: z.string().min(8).max(64),
  hardwareId: z.string().min(4).max(256),
});

export const renewSchema = z.object({
  licenseId: z.string().cuid().optional(),
  key: z.string().min(8).max(64).optional(),
  days: z.coerce.number().int().min(1).max(3650),
});

export const statusQuerySchema = z.object({
  key: z.string().min(8).max(64),
});

export const deviceDeleteSchema = z.object({
  key: z.string().min(8).max(64),
  hardwareId: z.string().min(4).max(256),
});

export type ActivateInput = z.infer<typeof activateSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
