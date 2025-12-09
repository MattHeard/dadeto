## Unexpected hurdles
- The coverage report kept reflecting `core/cloud/*` entry files with 99+% even after exhaustive tests because a tiny `other` branch in `assign-moderation-job-core` and the anonymous `'test'` fallback in `get-moderation-variant` were never exercised. Instrumenting the coverage HTML (from `reports/coverage/lcov-report`) made it clear that a single line in each file was responsible for the shortfall.
- The thin wrapper modules (`verifyAdmin.js`, `create-db.js`) also appear as 0% coverage entries every run despite having no behavior beyond re-exporting; I confirmed this by reading the HTML and JSON reports, which showed zero executable statements for those files even though the functionality is covered through the underlying core modules.

## How I addressed it
- Removed the dead `'other'` branch so the resolver object only contains the productive `'test'` and `'prod'` entries, matching `classifyDeploymentEnvironment` and eliminating the uncovered line without changing behavior.
- Added a new test to force `getAllowedOrigins` into the `test` path without a `PLAYWRIGHT_ORIGIN` so the `buildTestOrigins` fallback returns the empty array that previously went unverified.
- Added identity tests for the re-export wrappers to keep them part of the test surface even though they do nothing more than forward the implementation.

## Follow-up idea
- The re-export-only modules keep showing up as 0% even after the identity tests; we might want to revisit whether they should be excluded from coverage (via `/* istanbul ignore file */` or a config tweak) or turned into richer bridges so the tooling no longer flags them.
