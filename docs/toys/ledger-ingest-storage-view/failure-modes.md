# Ledger Ingest Permanent Data View Failure Modes

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
- Missing `getLocalPermanentData` helper in the toy environment.
- Invalid or missing inputs:
- Permanent root lacks the `LEDG3` bucket.
- Dependency/service unavailable:
- localStorage unavailable or blocked.
- Non-deterministic timing or ordering:
- Transaction order in permanent data does not match the merge order.
- Environment-specific behavior:
- Browser storage shape differs between local and deployed environments.

## Detection Signals
- Error signatures/log lines:
- `getLocalPermanentData` is not available
- Observable symptoms:
- Table shows no rows even though LEDG3 was previously persisted.
- Failing command(s):
- `npm test`
- `npm run lint`

## First-Response Playbook
1. Capture failing command and full output.
2. Inspect the `permanentData` localStorage root for the `LEDG3` bucket.
3. Confirm the toy is only reading storage and not mutating it.
4. Add/adjust harness or docs so the failure becomes reproducible and diagnosable.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
