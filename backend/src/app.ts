import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { globalLimiter } from './middlewares/rate-limit';
import { errorHandler, notFoundHandler } from './middlewares/error';
import { mountTelegramWebhook } from './modules/telegram/telegram.bot';
import routes from './routes';

// Serialize BigInt (Prisma telegramId) safely in JSON responses.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.isProd ? undefined : false,
    }),
  );

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
          return cb(null, true);
        }
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === `${env.API_PREFIX}/health` } }));

  app.use(globalLimiter);

  // Telegram webhook (production single-service mode) — mounted before routes/404.
  mountTelegramWebhook(app);

  app.use(env.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
