# Ascendia

Monorepo layout:

- `apps/mobile` — Expo / React Native app
- `apps/api` — Fastify backend API

## Mobile

- Start: `npm run mobile:start`
- Lint: `npm run mobile:lint`

## API

- Dev server: `npm run api:dev`

## Deploy API (Render)

- Build command: `npm run render:build`
- Start command: `npm run render:start`
- Health check path: `/health`

## Env

- Mobile env template: `apps/mobile/.env.example` (copy to `apps/mobile/.env`)
- API env template: `apps/api/.env.example` (copy to `apps/api/.env`)
