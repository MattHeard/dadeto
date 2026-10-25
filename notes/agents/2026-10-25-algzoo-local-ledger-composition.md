# AlgZoo local runner and audit ledger composition

## Hurdle

The core pilot runner required durable audit writes, and a local hash-chained
JSONL ledger existed, but callers still had to compose the two themselves.

## Diagnosis and fix

Added `createAuditedAlgZooPilotRunner` in the local layer. It binds the core
runner's required audit callback to the repository's private default ledger.
Tests inject an in-memory ledger, drive a synthetic paired run, verify the
session and pair-score event order, and prove that a failed start write stops
before investigator execution. No live Codex process, credential, held-out
value, hardware, or real ledger file was used.

## Evidence

- `node scripts/run-jest.js test/local/interpretability/algZooPilotRunner.test.js --runInBand --coverage=false` — PASS, 1 suite / 2 tests.
- Focused ESLint for the new local adapter and test — PASS.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` — PASS, all 10 gates, zero failures across six Jest shards.
- `npm run build` — PASS.
- `git diff --check` — PASS.

## Next-time guidance

This composition factory is not a launch command. Before a pilot can run, the
Pi runtime identity, enforceable isolation, live canary/leakage evidence,
no-held-out rehearsal, and external ledger-head anchoring must be completed and
reviewed. Keep the runner uninvoked until those gates are met.
