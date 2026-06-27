import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { startJobs, stopJobs } from './jobs/license-expiry.job';
import { registerTelegramWebhook } from './modules/telegram/telegram.bot';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  logger.info('Database connected');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Nurse 505 Plugin API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  startJobs();
  await registerTelegramWebhook().catch((err) => logger.error({ err }, 'Telegram webhook setup failed'));

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    stopJobs();
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => logger.error({ err }, 'uncaughtException'));
}

void bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
