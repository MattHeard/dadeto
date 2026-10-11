# Ledger storage merge arity cleanup

- Unexpected hurdle: none in the bounded implementation. The helper combined state mutation and report recording behind a five-value configuration object.
- Diagnosis: merge orchestration already belongs to `mergeCanonicalTransaction`, which has three explicit inputs. The extra helper only forwarded those dependencies to the action applier and report builder.
- Fix: remove the forwarding helper and perform the action application and report append directly within `mergeCanonicalTransaction`, preserving the insert/skip/update dispatch.
- Evidence: `test/toys/2026-03-13/ledger-ingest/ledgerIngestStorageToy.test.js` passed (4 tests); target ESLint and TSDoc passed; fresh no-cache inventory fell from 25 findings/25 files to 24/24 (`.tmp/parameter-bag-global-after-storage-toy.json`) with no finding in the target file; `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates including 11 local E2E tests, 0 clones, and 0 audit vulnerabilities; `TMPDIR=/home/matt/dadeto/.tmp npm run build` passed; `git diff --check` passed.
- Next time: inspect `src/core/browser/toys/2026-06-22/conwayLife.js:100` from the fresh scan and continue with a behavior-preserving decomposition, without suppression or superficial parameter packing.
