# gcp-test Playwright discovery fix

- Unexpected hurdle: the Cloud Run Playwright job failed with `No tests found` even though the same suite listed locally.
- Diagnosis path: downloaded the `playwright-report` artifact from the failed `gcp-test` run and extracted `report.json`, which showed an empty test set and the error message `No tests found. Make sure that arguments are regular expressions matching test files.` Local reproduction of `npx playwright test --config ./playwright.config.ts --list --reporter=list` confirmed the repository config still discovers 12 tests, so the failure was in the container invocation path rather than the test files themselves.
- Chosen fix: make `docker/playwright/entrypoint.sh` pass `test/e2e` explicitly to both the preflight discovery command and the actual Playwright run, and lock that contract with `test/scripts/playwright-entrypoint.test.js`.
- Next-time guidance: when a Cloud Run Playwright job reports an empty suite, inspect the generated HTML report before changing the app. If local discovery works but Cloud Run sees zero tests, make the test directory explicit in the wrapper so the container cannot drift on path resolution.
