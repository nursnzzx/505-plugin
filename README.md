# Nurse 505 Plugin

A complete licensing ecosystem for desktop plugins (Adobe After Effects, Premiere Pro, …) with deep Telegram integration.

Nurse 505 Plugin is a monorepo with four parts that share **one backend**:

| Part | Stack | Path |
|------|-------|------|
| **Backend API** | Node.js · TypeScript · Express · Prisma · PostgreSQL · JWT | [`backend/`](backend) |
| **Telegram Mini App** | Next.js 15 · React 19 · TailwindCSS · Framer Motion · Telegram WebApp SDK | [`web/`](web) |
| **Telegram Bot** | Telegraf · TypeScript | [`bot/`](bot) |
| **Database** | PostgreSQL (16 models) | [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) |

```
Desktop Plugin ─┐
Telegram Bot  ──┼──▶  Cloud Code API  ──▶  PostgreSQL
Mini App      ──┤
Admin Panel   ──┘
```

## Quick start

```bash
# 1. Start Postgres (and Redis) via Docker
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # fill in secrets + TELEGRAM_BOT_TOKEN
npm install
npm run prisma:migrate        # create schema
npm run prisma:seed           # admin, plans, plugins, news
npm run dev                   # http://localhost:4000/api/v1

# 3. Mini App
cd ../web
cp .env.example .env
npm install
npm run dev                   # http://localhost:3000

# 4. Bot
cd ../bot
cp .env.example .env
npm install
npm run dev
```

From the repo root you can also run everything together: `npm install && npm run dev`.

## Architecture highlights

- **Clean layered backend** — `routes → controllers → services → repositories`, with shared `middlewares`, `services`, `utils`, `jobs`, and `webhooks`.
- **License engine** — signed keys (HMAC), tiers (Free/Trial/Pro/Ultimate), 7 lifecycle states, device binding with hardware fingerprinting, device-change limits, offline-verifiable signatures.
- **Auth** — Telegram Mini App `initData` verification + JWT access/refresh with rotating sessions; separate admin email/password login with bcrypt.
- **Security** — Helmet, CORS allowlist, layered rate limiting, Zod validation everywhere, audit logs, IP logging, refresh-token rotation.
- **Payments** — provider-agnostic flow (Telegram Stars, Stripe, Crypto, Manual) with webhooks and idempotent fulfillment.
- **Admin** — dashboard KPIs + charts, license generator (single/bulk/CSV), users, devices, payments, promos, plugin versions, broadcast, audit logs.
- **Background jobs** — hourly license-expiry sweep + expiry warnings via Telegram.

## API surface

See [`backend/README.md`](backend/README.md) for the full endpoint reference. Core groups:

- `POST /auth/telegram`, `/auth/admin/login`, `/auth/refresh`, `/auth/logout`
- `POST /license/{activate,verify,heartbeat,deactivate,renew}`, `GET /license/{me,status,history,devices}`, `DELETE /license/device`
- `GET /plugins`, `POST /plugins/check-update`, `POST /plugins/:slug/download`, `POST /plugin/{crash,logs}`, `GET /plugin/bootstrap`
- `GET /news`, `GET /notifications`, `GET /payments/plans`, `POST /payments/invoice`
- `GET /admin/dashboard`, `/admin/licenses…`, `/admin/users…`, `/admin/{devices,payments,promos,plugins,logs,broadcast}`
- `POST /webhooks/{stripe,crypto,telegram-stars}`

## Desktop plugin integration

The plugin verifies on launch and heartbeats periodically:

```ts
// 1. Activate once with the user's key + hardware fingerprint
await fetch(`${API}/license/activate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key, device: { hardwareId, os, cpu, machineName, pluginVersion } }),
});

// 2. Verify on every launch (offline fallback: check the returned `signature`)
const { data } = await (await fetch(`${API}/license/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key, hardwareId, pluginVersion }),
})).json();
if (!data.valid) lockFeatures();

// 3. Heartbeat every few minutes → POST /license/heartbeat
```

## Default credentials (after seed)

- Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env` (default `admin@kanttools.local` / `ChangeMe123!`)
- Promo: `WELCOME10` (10% off)
