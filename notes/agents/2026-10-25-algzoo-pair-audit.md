# AlgZoo pair audit boundary

## Hurdle

The pilot runner accepted an optional audit callback. That let a scoring run
continue without durable lifecycle evidence, and successful blinded scores were
returned without an audit event.

## Diagnosis and fix

Require the injected audit writer when constructing the runner, fail before
launch when the session-start append fails, and append successful score results
through an allowlist sanitizer. Scoring failures produce a generic event without
the raw exception or evaluator inputs. The ledger accepts the two new event
types and rejects held-out-shaped fields.

## Evidence

- `node scripts/run-jest.js test/core/interpretability/algZooPilotHarness.test.js test/local/interpretability/algZooAuditLedger.test.js --runInBand --coverage=false` — PASS, 2 suites / 37 tests.
- `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` — PASS, all 10 gates; check summary reported `status: passed`, `failed: 0`.
- `npm run build` — PASS.
- `git diff --check` — PASS.

## Next-time guidance

The harness still needs a concrete executable entry point wired to the JSONL
ledger and an externally anchored ledger head before any real pilot can run.
Do not invoke a model, inspect held-out data, or access pilot credentials while
that prelaunch gate remains open.
