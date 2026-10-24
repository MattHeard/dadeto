# Threefold Guide Back coverage

The in-game Guide's final Back row used the shared subsection-return branch but had no direct regression. Added a controller-only test: open Y, enter How to Play, advance until `> BACK` is selected, and activate with A; the test confirms the Guide closes and the main menu returns.

Evidence:
- Focused coverage command: `node scripts/run-jest.js test/core/browser/game/threefold-menu.test.js --runInBand --coverage --coverageThreshold='{}' --collectCoverageFrom=src/core/browser/game/threefold/page.js --coverageReporters=json --coverageDirectory=/tmp/threefold-menu-guide-back-coverage` passed 1 suite / 9 tests; `page.js:491` changed from `[0,1]` to `[1,0]`.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards.
- `npm run threefold:spec:refresh:best-effort` and `git diff --check` passed; canonical spec cache had no changes.

The global Full Check coverage target remains unmet. This is a single return-path slice; no thresholds or exclusions changed.
