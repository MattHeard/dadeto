# Threefold Saves Back coverage

The Saves submenu's Back row was missing a focused positive-path regression. Extended the existing menu interaction test to save once, move to Back with Down, and activate it with A; it now asserts return to the main menu.

Evidence:
- Focused Jest: `node scripts/run-jest.js test/core/browser/game/threefold-menu.test.js --runInBand --coverage --coverageThreshold='{}' --collectCoverageFrom=src/core/browser/game/threefold/page.js --coverageReporters=json --coverageDirectory=/tmp/threefold-menu-saves-back-coverage` passed 1 suite / 8 tests. `page.js` branch counts: saves selector conditional `[1,1]`, Back action conditional `[1,1]`.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates, including six impact shards, lint, dependency checks, TypeScript docs, audit (0 vulnerabilities), and duplication (0 clones).

Next time, inspect the exact branch counts after menu interaction because the no-selector fallback is a separate branch from selecting Back. The global full-coverage Bead remains open; this slice does not adjust thresholds or exclusions.
