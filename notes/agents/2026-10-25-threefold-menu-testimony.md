# Threefold menu testimony

Added focused coverage proving the in-game Field Notes include attributed witness accounts and the unresolved-responsibility summary. The frame fixture supplies a testimony account with a speaker and statement, plus a responsibility question/status; the controller path opens the journal with Y/down/A.

Evidence:
- Focused menu coverage command: `node scripts/run-jest.js test/core/browser/game/threefold-menu.test.js --runInBand --coverage --coverageThreshold='{}' --collectCoverageFrom=src/core/browser/game/threefold/page.js --coverageReporters=json --coverageDirectory=/tmp/threefold-menu-testimony-coverage` passed 1 suite / 11 tests. The attributed-account callback at `page.js:578` was called twice across menu coverage, and the responsibility conditional at `page.js:585` had counts `[2,4]`.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards.
- `npm run threefold:spec:refresh:best-effort` and `git diff --check` passed; the canonical spec cache did not change.

This verifies only testimony rendering. Global Full Check coverage and Rank 2 completion remain open.
