# Failure Modes

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - Blog registration points at the wrong module path or export name.
  - The build does not copy the new module into `public/`.
- Invalid or missing inputs:
  - `period` or `overhead` is missing from the JSON payload.
  - A required number is negative or not finite.
- Dependency/service unavailable:
  - Not applicable; the toy is pure and does not call external services.
- Non-deterministic timing or ordering:
  - Not applicable; the toy should be deterministic.
- Environment-specific behavior:
  - None expected beyond the normal browser loader and Jest environment.

## Detection Signals
- Error signatures/log lines:
  - `Invalid real hourly wage input`
  - Jest snapshot or assertion mismatches in the new toy test file.
- Observable symptoms:
  - The toy returns a malformed JSON string.
  - Nominal or real hourly wage becomes `null` unexpectedly.
- Failing command(s):
  - `npm test`
  - `npm run build`

## First-Response Playbook
1. Capture the failing command and the exact JSON payload used.
2. Check whether the wrapper rejected the input or the pure calculator produced the wrong totals.
3. Fix the pure calculator first, then adjust the validation wrapper or docs.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
