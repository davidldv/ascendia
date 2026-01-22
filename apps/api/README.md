# Ascendia API

## Run

- Install from repo root: `npm install`
- Copy env: `cp .env.example .env`
- Dev: `npm run dev`

Health check: `GET /health`

## Scheduled Streak Enforcement (Cron)

The API enforces missed/partial-day failures on read (e.g. `/v1/missions/today`), but you can also run reconciliation on a schedule so streak breaks happen automatically soon after each user's local midnight.

### Option A: Run a script (recommended)

- Dev (TypeScript): `npm --workspace apps/api run reconcile:run`
- After build (production): `npm --workspace apps/api run build && npm --workspace apps/api run reconcile:run:prod`

Run this script from a scheduler (system cron, GitHub Actions, etc). For near-midnight behavior across timezones, run it frequently (e.g. every 5–15 minutes).

### Option B: Trigger an internal endpoint

Set `CRON_SECRET` in the API environment, then call:

`POST /internal/reconcile` with header `x-cron-secret: <CRON_SECRET>`

If `CRON_SECRET` is not set, the endpoint is disabled.
