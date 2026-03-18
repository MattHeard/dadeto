# Ledger Ingest Wrapper Loop

- Unexpected hurdle: the toy wrapper already existed, but there was no direct test exercising `ledgerIngestToy`.
- Diagnosis path: traced the toy docs to `src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestToy.js`, then confirmed `test/toys/2026-03-10/ledger-ingest.test.js` only covered the pure core.
- Chosen fix: added wrapper-level characterization tests for fixture selection and invalid-payload fallback.
- Next-time guidance: check for an existing runnable wrapper before adding new adapter code; if it exists, lock it in with one focused test instead of widening the scope.
