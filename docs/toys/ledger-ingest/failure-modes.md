# Failure Modes

## Initial Predicted Failure Classes
- Setup/configuration mismatch: forgetting to update `fieldMapping` causes `buildNormalizedTransaction` to read `undefined` fields and collapse dedupe keys to empty strings.
- Invalid or missing inputs: malformed dates turn into empty strings, which makes duplicate detection falsely flag every row.
- Dependency/service unavailable: Jest (Node 20+) must run locally; if the test harness cannot start, we cannot validate the core contract.
- Non-deterministic timing or ordering: canonical order depends on the raw row order, so upstream adapters must preserve deterministic batching or expect duplicate reports to shift.

## Detection Signals
- Error signatures/log lines: missing `sourceRecordId` or `postedDate` in a normalized transaction.
- Observable symptoms: `summary.dedupeFields` returns `['postedDate','amount','description']` but canonical transactions shrink to a single row; fixtures start failing.
- Failing command(s): `npm test -- test/toys/2026-03-10/ledger-ingest.test.js` exits non-zero, `ledger-ingest` fixture suite logs `FAIL`.

## First-Response Playbook
1. Capture the failing command (`npm test ...`) and copy the output into `reports/toys/ledger-ingest/commands.log`.
2. Inspect fixtures to see which normalization or dedupe assertion failed (missing date, amount, or description hygiene).
3. Update `src/core/browser/toys/2026-03-13/ledger-ingest/core.js` (or fixtures) so the normalization/dedupe logic matches the intended contract, then rerun the targeted test.

## Promoted from Real Failures
- None yet; core contract and fixtures are new.
