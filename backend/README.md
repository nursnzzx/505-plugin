# Nurse 505 Plugin Backend

Node.js + TypeScript + Express + Prisma + PostgreSQL.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start with hot reload (tsx) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server |
| `npm run prisma:migrate` | Create/apply migrations |
| `npm run prisma:seed` | Seed admin, plans, plugins, news |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Layout

```
src/
  config/        env (zod-validated), pino logger
  database/      prisma client
  middlewares/   auth, validate, error, rate-limit
  modules/       auth, users, licenses, devices, plugins,
                 payments, announcements, notifications, admin
  services/      activity, audit, notification, telegram-notify
  webhooks/      stripe, crypto, telegram-stars
  jobs/          license-expiry sweep
  utils/         jwt, crypto, license-key, telegram-auth, time, http, errors
  routes/        api router
  app.ts         express app
  server.ts      bootstrap
```

Each module follows `routes → controller → service → repository` with Zod validators.

## Endpoint reference

### Auth
- `POST /auth/telegram` `{ initData }` → `{ user, accessToken }` (+ refresh cookie)
- `POST /auth/admin/login` `{ email, password }`
- `POST /auth/refresh` · `POST /auth/logout`
- `POST /auth/dev` `{ telegramId }` (development only)

### License (plugin-facing)
- `POST /license/activate` `{ key, device }`
- `POST /license/verify` `{ key, hardwareId, pluginVersion? }`
- `POST /license/heartbeat` `{ key, hardwareId }`
- `POST /license/deactivate` `{ key, hardwareId }`
- `GET  /license/status?key=`

### License (account-facing, JWT)
- `GET /license/me` · `GET /license/history` · `GET /license/devices`
- `DELETE /license/device` `{ key, hardwareId }`
- `POST /license/renew` `{ key|licenseId, days }`

### Plugins / telemetry
- `GET /plugins` · `GET /plugins/:slug/versions` · `GET /plugins/:slug/latest`
- `POST /plugins/check-update` · `POST /plugins/:slug/download`
- `POST /plugin/crash` · `POST /plugin/logs` · `GET /plugin/bootstrap`

### Content & billing
- `GET /news` · `GET /news/:id`
- `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all`
- `GET /payments/plans` · `POST /payments/invoice` · `GET /payments/me`

### Admin (JWT, admin principal)
- `GET /admin/dashboard`
- `GET /admin/licenses` · `GET /admin/licenses/export.csv` · `POST /admin/licenses/generate`
- `POST /admin/licenses/:id/status` · `POST /admin/licenses/:id/renew` · `DELETE /admin/licenses/:id`
- `GET /admin/users` · `GET /admin/users/:id` · `POST /admin/users/:id/ban`
- `GET /admin/devices` · `DELETE /admin/devices/:id`
- `GET|POST|PATCH|DELETE /admin/announcements`
- `GET|POST|DELETE /admin/plugins` · `GET|POST|DELETE /admin/promos`
- `GET /admin/payments` · `GET /admin/subscriptions` · `GET /admin/logs`
- `POST /admin/broadcast`

### Webhooks
- `POST /webhooks/stripe` · `POST /webhooks/crypto` · `POST /webhooks/telegram-stars`

All responses use the envelope `{ success, data, meta? }` or `{ success: false, error }`.
