# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS dev

WORKDIR /workspace

# Avoid interactive prompts and reduce noisy logs
ENV CI=true \
    npm_config_update_notifier=false \
    npm_config_fund=false

# Some tooling expects git to exist (and it's small on slim)
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install workspace deps (cached) using only package manifests.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json

RUN npm ci

# Default command is overridden by docker-compose.
CMD ["node", "-v"]
