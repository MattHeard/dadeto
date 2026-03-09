## Context

`reports/coverage/coverage-summary.json` had become a stale single-file artifact, which made branch-coverage planning unreliable even though the raw Jest coverage output was still repo-wide.

## What changed

- Added [src/scripts/write-coverage-summary.js](/home/matt/dadeto/src/scripts/write-coverage-summary.js) to rebuild `reports/coverage/coverage-summary.json` from `reports/coverage/coverage-final.json`.
- Updated the `test` script in [package.json](/home/matt/dadeto/package.json) so every full `npm test` run rewrites the summary after Jest finishes.

## Evidence

- Before the fix, `coverage-final.json` had `120` file entries while `coverage-summary.json` only had `total` plus `blogKeyHandler.js`.
- After the fix, a fresh `npm test` rewrote `coverage-summary.json` with `121` keys: `total` plus the same `120` file entries from `coverage-final.json`.
- `npm test` passed with `473` suites and `2317` tests.

## Canonical artifact

For branch-coverage planning, the canonical top-level summary is now `reports/coverage/coverage-summary.json`, and its source of truth is the repo-wide raw coverage map in `reports/coverage/coverage-final.json`.
