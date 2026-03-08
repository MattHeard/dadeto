# 2026-03-08: blogKeyHandler branch coverage evidence

- Bead: `dadeto-8kls`
- Scope: verify whether `src/core/browser/inputHandlers/blogKeyHandler.js` still has uncovered branch gaps in the current coverage artifacts.
- Finding:
  - the fresh `reports/coverage/lcov.info` record for `src/core/browser/inputHandlers/blogKeyHandler.js` reports `BRF:6` and `BRH:6`, which means branch coverage is currently `100%`
  - `reports/coverage/coverage-summary.json` still shows `80%` branches for this file, so that summary artifact appears stale or inconsistent with the current LCOV output
- Validation:
  - `npm test` passed with `468` suites and `2306` tests
  - the current LCOV record for `blogKeyHandler.js` shows all tracked branches hit
- Follow-up:
  - if branch-coverage shaping continues, prefer the fresh per-file `lcov.info` record or regenerate the summary artifact before creating another bead from the stale `coverage-summary.json` entry
