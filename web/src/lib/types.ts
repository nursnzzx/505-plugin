export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

export interface User {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  avatarUrl: string | null;
  languageCode: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  email: string | null;
  createdAt: string;
  stats?: { devices: number; licenses: number; referrals: number };
}

export interface Remaining {
  expired: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
}

export interface License {
  id: string;
  key: string;
  tier: 'FREE' | 'TRIAL' | 'PRO' | 'ULTIMATE';
  status: string;
  maxDevices: number;
  currentDevices: number;
  activationCount: number;
  deviceChanges: number;
  pluginVersion: string | null;
  issuedAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  lastOnlineAt: string | null;
  remaining: Remaining | null;
  progress: number;
  signatureValid: boolean;
  plan: { id: string; code: string; name: string } | null;
}

export interface Device {
  id: string;
  hardwareId: string;
  platform: string;
  os: string | null;
  machineName: string | null;
  ip: string | null;
  country: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  kind: string;
  isPinned: boolean;
  coverUrl: string | null;
  publishedAt: string;
}

export interface PluginVersion {
  id: string;
  slug: string;
  name: string;
  version: string;
  channel: string;
  releaseNotes: string | null;
  downloadUrl: string;
  fileSizeBytes: number;
  systemRequirements: Record<string, unknown> | null;
  isLatest: boolean;
  publishedAt: string;
}

export interface UserStats {
  launchesToday: number;
  launchesThisWeek: number;
  activeDays: number;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  tier: string;
  priceCents: number;
  currency: string;
  durationDays: number;
  maxDevices: number;
  features: string[];
}
