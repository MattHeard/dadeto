# Threefold Campaign menu state

The in-game Campaign section previously had a route-selection test with empty state only. Extended it to render actual saved campaign locations, fallback ID and state labels, pressure, clock minutes, and Return Tide text; it then swaps to missing/null campaign collections and no tide to verify the empty-state fallbacks.

Evidence:
- Focused coverage: `node scripts/run-jest.js test/core/browser/game/threefold-menu.test.js --runInBand --coverage --coverageThreshold='{}' --collectCoverageFrom=src/core/browser/game/threefold/page.js --coverageReporters=json --coverageDirectory=/tmp/threefold-menu-campaign-content-coverage` passed 1 suite / 10 tests. Campaign locations and pressure formatter callbacks both ran; `page.js:597-612` collection/default, location label/state, active-state, and tide conditionals have both outcomes covered in the report.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards.
- `npm run threefold:spec:refresh:best-effort` and `git diff --check` passed; canonical spec cache was unchanged.

No coverage thresholds or exclusions changed. The global Full Check and Rank 2 acceptance remain open.
