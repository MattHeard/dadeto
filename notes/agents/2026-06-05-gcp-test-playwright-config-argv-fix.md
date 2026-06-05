# 2026-06-05 · gcp-test Playwright config argv fix

- Unexpected hurdle: the Cloud Run Playwright job failed immediately with exit code 2, but the execution-scoped log bundle was empty and the first pass looked like a generic container failure.
- Diagnosis path: downloaded the execution logs from the latest `gcp-test` run and found `error: unknown option '--config ./playwright.config.ts'` in the job logs. That pointed to shell argument packing, not test discovery or app runtime behavior.
- Chosen fix: changed `docker/playwright/entrypoint.sh` to pass the config as a proper argv array (`CONFIG=(--config ./playwright.config.ts)`) and updated the entrypoint guardrail test to lock that shape in.
- Next-time guidance: when a CLI wrapper uses `set -euo pipefail`, prefer argv arrays for flags with values so the shell cannot collapse them into a single malformed option string.
