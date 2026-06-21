#!/usr/bin/env bash
set -euo pipefail

cd /app
exec node scripts/run-e2e.js --suite cloud --environment ephemeral-gcp
