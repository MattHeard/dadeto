#!/usr/bin/env bash
set -euo pipefail
npx playwright test --reporter=html
node e2e/upload-report.js
