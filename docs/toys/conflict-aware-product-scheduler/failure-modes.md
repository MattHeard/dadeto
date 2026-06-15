# Failure Modes: Conflict-Aware Product Scheduler

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - The toy file is not registered in `src/build/blog.json`, so it never appears in the public index.
- Invalid or missing inputs:
  - `candidates` or `activeWork` is not an array.
  - Numeric fields are missing or non-numeric.
  - Touch-set arrays contain non-string items.
- Dependency/service unavailable:
  - None expected for the first version.
- Non-deterministic timing or ordering:
  - Ties do not sort consistently.
- Environment-specific behavior:
  - Build artifacts regenerate correctly locally but not in the shipped `public/` tree.

## Detection Signals
- Error signatures/log lines:
  - Jest failure in `test/toys/2026-06-15/conflictAwareProductScheduler.test.js`.
  - Missing `SCHD1` in `public/blog.json`.
- Observable symptoms:
  - Ranked output is unsorted or score math is wrong.
  - Public index does not show the new toy.
- Failing command(s):
  - `npm test`
  - `npm run check`
  - `npm run build`

## First-Response Playbook
1. Capture the failing command and full output.
2. Check whether the failure is parse, scoring, sorting, or manifest registration.
3. Add or adjust a focused Jest case before changing the scheduler logic.
4. Rebuild the public assets and re-run the repo gates.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
