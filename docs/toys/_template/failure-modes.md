# Failure Modes Template

Document expected breakpoints and promote observed failures into reusable guidance.

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
- Invalid or missing inputs:
- Dependency/service unavailable:
- Non-deterministic timing or ordering:
- Environment-specific behavior:

## Detection Signals
- Error signatures/log lines:
- Observable symptoms:
- Failing command(s):

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
