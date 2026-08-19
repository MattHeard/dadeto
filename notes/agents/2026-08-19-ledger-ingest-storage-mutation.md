# Ledger-ingest storage mutation loop

- Unexpected hurdle: the resumable `npm run mutant:find` checkpoint was stale, but the resumed scan correctly found a new current target: `ledgerIngestStorageCore.js` with five executable survivors and three configured ignored mutations.
- Diagnosis: survivors covered an unobserved clone fallback, redundant environment fallback code, missing-merge-key filtering, and the read-only storage view report.
- Chosen fix: removed the redundant clone/environment branches and added focused assertions for fallback cloning, preserved transaction order with missing keys, and the complete storage view report.
- Evidence: `npm run mutant:find` found and stopped on `src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestStorageCore.js`. The final file-scoped Stryker scan executed 51 mutants: 49 executable mutants killed, 0 executable survivors, 0 timeouts, and 2 configured ignored static mutations. Focused Jest passed 4 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: trust fresh resumable mutant-find output over stale aggregate reports; distinguish executable survivors from configured static mutations and cover exported report builders directly.
