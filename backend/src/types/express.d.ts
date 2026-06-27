import type { AdminRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        principal: 'user' | 'admin';
        sub: string;
        telegramId?: string;
        role?: AdminRole | string;
      };
    }
  }
}

export {};
