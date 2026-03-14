# Ledger ingest invalid row (runner loop 2026-03-14)

- **Unexpected hurdle:** None; the fixture and core already expose structured error data, so the loop stayed in observation/recording mode.
- **Diagnosis path:** Confirmed the fixture/test pair lives in `src/core/browser/toys/2026-03-13/ledger-ingest/core.js` and `test/toys/2026-03-10/ledger-ingest.test.js`, then reran the targeted suite to prove nothing regressed.
- **Chosen fix:** Ran `npm test -- test/toys/2026-03-10/ledger-ingest.test.js` (476 suites / 2,355 tests, coverage 94.08%) and logged the invalid-row summary (`rawRecords=2`, `canonicalTransactions=1`, `duplicatesDetected=0`, `errorsDetected=1`) plus the structured error report from `importTransactions(fixtures.invalidRow.input)` so future loops know the counts.
- **Next time:** If invalid-row handling grows, add another fixture/test pair and capture the new summary/error counts rather than re-running this verification-only loop.
