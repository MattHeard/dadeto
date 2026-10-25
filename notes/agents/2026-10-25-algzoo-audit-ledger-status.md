# AlgZoo audit-ledger status command

## Hurdle

The private JSONL audit ledger verified its hash chain on read, but no safe
operator-facing command exposed a digest that could later be anchored outside
the investigator workspace. Printing full records would leak session metadata
and was unnecessary for this check.

## Fix

Added `npm run interpretability:algzoo:audit-ledger-status`. It reads through
the validating ledger API and prints only `hashChain`, record count, current
head digest, and interrupted-session count. It never writes the ledger or emits
record payloads or session IDs. The output digest is not itself an external
anchor, and the command does not provide OS-level append-only protection or
isolation.

## Evidence

- `npx jest test/core/local/interpretability/algZooAuditLedgerStatus.test.js --runInBand --coverage=false` — PASS, 1 suite / 4 tests, synthetic injected ledger only.
- `npx eslint --max-warnings=0 src/core/local/interpretability/algZooAuditLedgerStatus.js src/local/verify-algzoo-audit-ledger.js test/core/local/interpretability/algZooAuditLedgerStatus.test.js` — PASS.
- `node src/local/verify-algzoo-audit-ledger.js --help` — expected usage rejection (exit 2) without reading the default ledger.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` — PASS, all 10 gates; six impact shards passed (7,673 tests total).
- `npm run build` — PASS.
- `git diff --check` — PASS.

## Next time

Keep the scientific pilot blocked until the Pi runtime, enforced isolation,
real canary/leakage probes, externally preserved head digest, and rehearsal
gates are independently satisfied. Do not treat the local chain or synthetic
tests as evidence of external immutability or isolation.
