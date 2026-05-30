# Failure Modes: Memory Scalar/Vector Write

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - Blog metadata points at the wrong module path or function name.
- Invalid or missing inputs:
  - Non-object JSON, blank path, missing `value`, unsupported `memoryLocation`, or object leaf values.
- Dependency/service unavailable:
  - Missing `setLocalTemporaryData` or `setLocalPermanentData` helper in the toy environment.
- Non-deterministic timing or ordering:
  - Read-back assertions must use the same in-memory env instance immediately after the write.
- Environment-specific behavior:
  - Sparse arrays serialize `undefined` slots as `null` in JSON, so tests should validate read-back through `MEMO2` rather than relying only on raw JSON string shape.

## Detection Signals
- Error signatures/log lines:
  - `Input must be a JSON object write request.`
  - `A non-empty path or key is required.`
  - `A value property is required.`
  - `Value must be a scalar or vector array.`
  - `Unsupported memoryLocation`
  - `Missing toy helper`
- Observable symptoms:
  - `MEMO2` cannot find the path after a reported successful write.
  - Sibling memory entries disappear after an update.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryScalarVectorWrite.test.js`
  - `npm test`

## First-Response Playbook
1. Capture failing command and full output.
2. Confirm the normalized request (`memoryLocation`, `path`, `value`) in the failing test.
3. Inspect whether the writer selected the expected persistence helper for `temporary`, `permanent`, or `envelope`.
4. Re-run `MEMO2` against the written path in the same env fixture to separate write failure from read-back failure.
5. Add or adjust a focused Jest case before changing production logic.

## Promoted from Real Failures
- Date: 2026-05-30
- Failure observed: Numeric path construction created an object at `matrix.0` rather than an array for `matrix.0.1`.
- Root cause: Parent-container creation looked only at sliced parent segments, so the final leaf segment was not visible when choosing the container shape.
- Fix implemented: Parent resolution now passes the next segment from the complete path segment list.
- Guardrail added: Targeted Jest coverage for `matrix.0.1` construction plus `MEMO2` read-back.
