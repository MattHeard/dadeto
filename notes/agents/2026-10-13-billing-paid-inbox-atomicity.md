# Billing paid-purchase inbox atomicity

- Unexpected hurdle: the full repository check took several minutes because unit coverage runs in serial shards before the aggregate gates.
- Diagnosis path: kept polling the same live `npm run check` process and confirmed each reported shard passed; waited for the terminal `check-summary` instead of inferring success from partial shard output.
- Chosen fix: `markPurchasePaid` now reads the payment event inside its Firestore transaction and writes `status: applied` alongside the paid purchase, credit, lot, and ledger changes. The existing verified event payload is retained. A regression test covers the persisted status and payload.
- Evidence: focused billing suite passed (1 suite / 39 tests); targeted ESLint, `npm run tsdoc:check`, and `git diff --check` passed; `DADETO_CHECK_TIMEOUT_MS=7200000 npm run check` passed all 10 aggregate gates with zero failures, including 11 local E2E tests.
- Next guidance: continue the same Billing spec with atomic inbox handling for expiry and restart/reordered-event adversarial tests. The current loop does not establish the full billing protocol acceptance.
