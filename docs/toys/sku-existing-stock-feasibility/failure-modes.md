# SKUE1 Failure Modes

Document expected breakpoints and promote observed failures into reusable guidance.

## Initial Predicted Failure Classes

- Missing SKU or asset list: structured infeasibility.
- Invalid candidate: treated as infeasible while later candidates remain eligible.
- Non-deterministic ordering: prevented by lexical asset-ID sorting.

## Detection Signals

- Error signatures/log lines: JSON `reason` field when the request is malformed.
- Observable symptoms: `{ "feasible": false }`.
- Failing command(s): focused Jest command in acceptance.md.

## First-Response Playbook

1. Capture failing command and full output.
2. Isolate whether failure is setup, logic, or environment.
3. Add/adjust harness or docs so failure becomes reproducible and diagnosable.

## Promoted from Real Failures

- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
