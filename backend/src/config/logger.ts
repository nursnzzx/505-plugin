import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.isProd ? 'info' : 'debug',
  transport: env.isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      }
    : undefined,
  base: { service: 'kanttools-api' },
});

export type Logger = typeof logger;
