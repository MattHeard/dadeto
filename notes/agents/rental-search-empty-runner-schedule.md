## Rental search schedule defaults

- **Unexpected hurdle**: The first loop proposal also changed the Cloud Run Playwright entrypoint to run the local simulator suite. That conflicts with the repository's cloud-only Cloud Run E2E policy.
- **Diagnosis and fix**: The GCP test workflow explicitly writes a bounded, temporary runner schedule before the cloud API E2E. Keep the Cloud Run entrypoint on `--suite cloud`; the aggregate local check already exercises the local static-search browser flow.
- **Result**: The production Terraform seed is now `[]`, which means a new deployment claims no runner availability. Terraform still ignores schedule object content so operator edits persist. Empty schedules are covered by provider and HTTP behavior tests.
- **Deployment guard**: The production static build now fails before deploy unless the generated search page embeds an HTTPS endpoint. Keep the build-target and endpoint configuration before `npm run build:browser` and the guard after it.
- **User-facing boundary**: The static page states that results are informational and do not place an order or reservation; the local browser E2E asserts the notice is rendered.
- **Next-time guidance**: Keep schedule truth operator-owned. Seed availability only in disposable test environments, and check `docs/quality/evaluator-matrix.md` before changing which suite Cloud Run executes.
- **Evidence**: `TMPDIR=/home/matt/dadeto/.tmp JEST_CACHE_DIRECTORY=/home/matt/dadeto/.jest-cache npm run check` passed all 10 gates, including the local rental-search browser E2E and production endpoint workflow test.
