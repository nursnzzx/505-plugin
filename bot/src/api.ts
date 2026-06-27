import { config } from './config';

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

/** Thin server-side API client for the bot (uses dev login by Telegram id). */
export const api = {
  async licenseStatus(key: string) {
    const res = await fetch(`${config.apiUrl}/license/status?key=${encodeURIComponent(key)}`);
    const json = (await res.json()) as Envelope<unknown>;
    if (!json.success) throw new Error(json.error?.message ?? 'Lookup failed');
    return json.data as {
      tier: string;
      status: string;
      expiresAt: string | null;
      remaining: { days: number; hours: number } | null;
      currentDevices: number;
      maxDevices: number;
    };
  },
};
