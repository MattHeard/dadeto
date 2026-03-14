# Ledger ingest invalid row (runner verification)

- **Unexpected hurdle:** None; the invalid-row fixture and structured error handling already existed, so the loop focused on confirming the documented counts.
- **Diagnosis path:** Checked `src/core/browser/toys/2026-03-13/ledger-ingest/core.js` and `test/toys/2026-03-10/ledger-ingest.test.js` to ensure the fixture drives the pure-core import and error-report contract.
- **Chosen fix:** Reran `npm test -- test/toys/2026-03-10/ledger-ingest.test.js`, which still reports 2 raw rows, 1 canonical transaction, 1 error (missing `postedDate` and `amount`), and 0 duplicates, so the pure core remains stable; recorded the passing run for future runners.
- **Next time:** If we extend invalid-row handling, add another fixture/test pair and capture the new summary counts again instead of re-running this verification-only loop.
