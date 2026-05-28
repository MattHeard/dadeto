# Failure Modes: Memory Vector

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - The runtime does not provide `getData` or `getLocalPermanentData`.
- Invalid or missing inputs:
  - Blank paths, malformed JSON, or unsupported `memoryLocation` values.
- Dependency/service unavailable:
  - The selected memory helper exists but returns a non-object root.
- Non-deterministic timing or ordering:
  - None expected; the toy is synchronous and read-only.
- Environment-specific behavior:
  - Temporary and permanent stores may be empty depending on the current browser session.

## Detection Signals
- Error signatures/log lines:
  - `Unsupported memoryLocation`
  - `Missing toy helper`
  - `did not return a valid object or array`
- Observable symptoms:
  - `found:false` responses with empty `vector` arrays.
  - Structured JSON error payloads instead of thrown exceptions.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryVector.test.js`

## First-Response Playbook
1. Capture the exact input and returned JSON.
2. Confirm which memory location was selected and which helper was available.
3. Decide whether the failure is a bad path, missing helper, or storage-shape mismatch.
4. Add or tighten a test for the observed case before changing the toy again.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
