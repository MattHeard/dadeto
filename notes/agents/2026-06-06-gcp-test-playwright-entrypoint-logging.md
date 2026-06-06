# GCP Playwright discovery logging

## Unexpected hurdle
The Cloud Run Playwright job kept failing with `No tests found`, even though local discovery from the repo root still listed the full suite.

## Diagnosis path
We already made the entrypoint point at `test/e2e` explicitly, but the CI failure still did not show enough runtime context to distinguish a pathing issue from a missing-file issue. The container needed to report its own working directory, resolved config path, resolved test directory, and the exact files visible under `test/e2e`.

## Chosen fix
Add startup logging in `docker/playwright/entrypoint.sh` for:
- `pwd`
- resolved `playwright.config.ts`
- resolved `test/e2e`
- a sorted file listing for `test/e2e`

Keep the existing preflight `--list` check so discovery still fails fast in CI.

## Next-time guidance
If discovery fails again, inspect the Cloud Run logs first. The new snapshot should tell us whether the container is mounted where we expect and whether `test/e2e` is present at all before Playwright starts.
