#!/usr/bin/env sh
set -eu

# Runs Ascendia reconciliation once.
# Intended for use from cron (every 15 min) or manually.
#
# It relies on dotenv in the script entrypoint, so ensure apps/api/.env exists.

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT_DIR"

npm --workspace apps/api run reconcile:run
