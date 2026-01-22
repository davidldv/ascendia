# Local Docker dev (API + Mobile)

This repo is a monorepo with:

- `apps/api` (Fastify)
- `apps/mobile` (Expo / React Native)

This setup runs both services in **dev mode** using Docker Compose with bind-mounts for fast iteration.

## 1) Create env files

Docker Compose expects these to exist:

- `apps/api/.env` (see `apps/api/.env.example`)
- `apps/mobile/.env` (see `apps/mobile/.env.example`)

From repo root:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Then fill in required values (notably Supabase keys for the API).

## 2) Start everything

```bash
docker compose up --build
```

- API: http://localhost:3000/health
- Metro bundler: http://localhost:8081

### Optional: run server reconciliation every 15 minutes

This enables the cron-style streak enforcement loop (runs the API reconciliation script every 900 seconds).

```bash
docker compose --profile cron up --build
```

If Docker build fails on your machine with an overlayfs/containerd error (e.g. `failed to mount ... err: no such device`), use host cron instead:

1. Verify the script runs:

```bash
cd /david/dev/ascendia && sh apps/api/scripts/reconcile-15m.sh
```

2. Install cron (every 15 minutes):

```bash
crontab -e
```

Then paste the line from `apps/api/scripts/cron-15m.example`.

## 3) Using a physical device (Expo Go / dev build)

Two values matter for phones:

1. The Metro URL must be reachable from your phone.
2. `EXPO_PUBLIC_API_BASE_URL` must point to a URL your phone can reach.

Recommended: set both to your host machine’s LAN IP.

Example:

```bash
EXPO_PACKAGER_HOSTNAME=192.168.1.50 \
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3000 \
docker compose up --build
```

Notes:

- The Compose config runs Expo with `--lan` so the QR code uses LAN networking.
- `localhost` will not work from a phone; use your LAN IP.

## 4) If hot reload doesn’t notice file changes

Some Docker setups don’t propagate filesystem events; enable polling:

```bash
CHOKIDAR_USEPOLLING=1 WATCHPACK_POLLING=1 docker compose up --build
```

## Troubleshooting

- If Compose fails immediately complaining about missing env vars, verify your `.env` files exist and are filled.
- Avoid sharing `docker compose config` output publicly: it expands environment variables and can print secrets.
