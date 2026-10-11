# Ledger ingest core parameter-bag cleanup

- Unexpected hurdle: no runtime issue appeared; fixture record construction is a raw-data contract and should remain easy to read as named fields.
- Diagnosis: the two findings were an over-destructured raw record and a canonical-insertion payload combining a transaction with all mutable dedupe collections.
- Fix: raw record construction now reads its named input fields directly. Canonical insertion receives the normalized transaction plus a cohesive dedupe state containing policy and result collections.
- Evidence: target no-cache scan is clear in `.tmp/ledger-core-arity.json`; focused ledger ingest tests passed (4 suites, 24 tests); TSDoc passed; final elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 evaluators with 0 clones and 0 audit vulnerabilities (`.tmp/ledger-core-arity-check.log`). Refreshed global inventory `.tmp/parameter-bag-global-after-ledger-core.json`: 52 findings across 47 files, down from 54.
- Next-time guidance: treat JSON rows as explicit domain records while grouping dedupe outputs into a named state object.
