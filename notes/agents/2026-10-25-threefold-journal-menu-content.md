# Threefold journal menu content

The Y > Field Notes menu was reading witness-ledger entries as if they had the old `speaker`, `statement`, `text`, or `action` shape. `createThreefoldRuntime` instead exposes entries from `presentThreefoldWitnessEntry`, with `title`, `intention`, `knowledge`, `consequence`, and optional `relation`; the previous formatter could therefore show `MARA: undefined` for a real saved choice.

Changed the menu to wrap and display the canonical title and factual fields, adding the relation only when present. Added a regression with linked and unlinked presentation entries and verified the menu shows the choice, intent, what was known, and observed consequence. The existing empty-journal test remains.

Evidence:
- Focused Jest and page coverage: `node scripts/run-jest.js test/core/browser/game/threefold-menu.test.js --runInBand --coverage --coverageThreshold='{}' --collectCoverageFrom=src/core/browser/game/threefold/page.js --coverageReporters=json --coverageDirectory=/tmp/threefold-menu-journal-content-coverage` passed 1 suite / 10 tests. The relation conditional at page.js:575 recorded both outcomes `[2,2]`.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards.
- `npm run build`, `npm run threefold:spec:refresh:best-effort`, and `git diff --check` passed; the canonical cache did not change.

The first focused assertion expected the title to wrap after “4.25”; actual 18-character wrapping kept “GAME” on that line. Corrected the expectation to match rendered output and reran the suite successfully. Full Check remains the authoritative global coverage/E2E gate; do not claim Rank 2 complete until its exact-head result and remaining acceptance are reviewed.
