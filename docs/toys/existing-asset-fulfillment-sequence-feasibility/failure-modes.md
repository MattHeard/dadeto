# EXIS2 Failure Modes

Document expected breakpoints and promote observed failures into reusable guidance.

## Initial Predicted Failure Classes

- Missing or duplicate required operations: structured infeasibility.
- Missing points or conflicting spatial records: resolver rejection.
- Temporal overlap, mismatched touching IDs, and location discontinuity: false.

## Detection Signals

- Error signatures/log lines: JSON `reason` field.
- Observable symptoms: no mutation or persistence.
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
