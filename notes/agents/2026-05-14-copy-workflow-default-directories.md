# 2026-05-14 Copy Workflow Default Directories

## Context
- Bead: `dadeto-8lt8`
- Goal: stop passing the copy directory map to both `createCopyCore` and `runCopyWorkflow`.

## Chosen Fix
- Updated `runCopyWorkflow` to default to the directories captured by `createCopyCore`.
- Kept an optional `directories` override for tests or future callers.
- Removed the duplicate `directories` argument from `src/build/copy.js`.
- Updated `test/core/copy.test.js` so the workflow test exercises the default captured-directory path.

## Evidence
- Focused `test/core/copy.test.js` passed; the nonzero exit was only the expected global coverage threshold on a targeted run.
- `npm test` passed with 504 suites, 2560 tests, and 100% statements/branches/functions/lines.
- `npm run check` passed with Jest, lint, dependency-cruiser, duplication, non-core thinness, and `npm audit` reporting 0 vulnerabilities.
