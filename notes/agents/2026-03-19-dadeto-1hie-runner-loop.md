# dadeto-1hie runner loop

- Unexpected hurdle: `npm test -- test/toys/2026-03-10/ledger-ingest.test.js` still runs the repo-wide Jest script, so the targeted check is not isolated.
- Diagnosis path: confirmed the wrapper already exists at `src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestToy.js` and is covered by `test/toys/2026-03-10/ledger-ingest.test.js`.
- Chosen fix: no code change; recorded the loop contract in `bd` and used the existing harness as acceptance evidence.
- Next-time guidance: if this bead reopens, tighten the evaluator first or add a truly targeted script so the wrapper slice can be verified without the full suite overhead.
