# 2026-06-14 check violations and landing

- Hurdle: `npm run check` kept regressing between lint, duplication, and `tsdoc` as the Stryker runner was simplified.
- Diagnosis: the runner changes removed helper exports and shifted the failure path enough that stale tests and clone reports kept pointing at the old structure.
- Fix: collapsed the runner API to a single object-based command path, updated the tests to exercise public behavior, then cleaned up the remaining repo warnings in `poll.js`, CSV parsing, and the small wrapper functions.
- Next time: when a gate churns across multiple categories, update the tests at the same time as the refactor so removed helpers do not leave stale coverage or export expectations behind.
