'use client';

import { create } from 'zustand';
import type { License, User, UserStats } from './types';
import { api, setToken } from './api';
import { initTelegram } from './telegram';

interface AppState {
  user: User | null;
  activeLicense: License | null;
  licenses: License[];
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
  refreshLicense: () => Promise<void>;
  refreshStats: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  activeLicense: null,
  licenses: [],
  stats: null,
  loading: true,
  error: null,

  async authenticate() {
    set({ loading: true, error: null });
    try {
      const tg = initTelegram();
      let auth: { user: User; accessToken: string };

      if (tg?.initData) {
        auth = await api.post<{ user: User; accessToken: string }>(
          '/auth/telegram',
          { initData: tg.initData },
          { auth: false },
        );
      } else {
        // Local development fallback when not inside Telegram.
        auth = await api.post<{ user: User; accessToken: string }>(
          '/auth/dev',
          { telegramId: 999000111 },
          { auth: false },
        );
      }

      setToken(auth.accessToken);
      set({ user: auth.user });
      await Promise.all([get().refreshLicense(), get().refreshStats()]);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Authentication failed' });
    } finally {
      set({ loading: false });
    }
  },

  async refreshLicense() {
    try {
      const data = await api.get<{ active: License | null; all: License[] }>('/license/me');
      set({ activeLicense: data.active, licenses: data.all });
    } catch {
      /* user may have no license yet */
      set({ activeLicense: null, licenses: [] });
    }
  },

  async refreshStats() {
    try {
      const stats = await api.get<UserStats>('/users/me/stats');
      set({ stats });
    } catch {
      set({ stats: null });
    }
  },

  async logout() {
    await api.post('/auth/logout').catch(() => undefined);
    setToken(null);
    set({ user: null, activeLicense: null, licenses: [], stats: null });
  },
}));
