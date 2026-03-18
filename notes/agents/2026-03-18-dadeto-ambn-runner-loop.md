# dadeto-ambn runner loop

- unexpected hurdle: `npm test -- test/toys/2026-03-10/ledger-ingest.test.js` still runs the full Jest suite, so the bounded check was slower than the bead title implied.
- diagnosis path: inspected `src/core/browser/toys/2026-03-13/ledger-ingest/core.js`, `test/toys/2026-03-10/ledger-ingest.test.js`, and the ledger-ingest toy spec to confirm the existing contract shape and where the first explicit schema assertion belonged.
- chosen fix: added a canonical transaction shape assertion to the happy-path fixture test, then verified with `npm test -- test/toys/2026-03-10/ledger-ingest.test.js` (476/476 suites passed, 2361/2361 tests passed).
- next-time guidance: keep this bead-sized work in the fixture test unless the schema itself changes; the current core already emits the canonical envelope.
