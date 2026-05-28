# Failure Modes: Memory Vector

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - The new toy file or blog entry is added, but the generated public assets are not rebuilt.
- Invalid or missing inputs:
  - Blank paths, malformed JSON, or unsupported `memoryLocation` values.
- Dependency/service unavailable:
  - The selected memory helper exists but returns a non-object root.
- Non-deterministic timing or ordering:
  - None expected; the toy is synchronous and read-only.
- Environment-specific behavior:
  - The runtime exposes temporary or permanent helpers differently than expected.

## Detection Signals
- Error signatures/log lines:
  - `Unsupported memoryLocation`
  - `Missing toy helper`
  - `Input must be a JSON object or a string path.`
- Observable symptoms:
  - `found:false` responses with empty `vector` arrays.
  - Object lookups returning singleton wrapped objects instead of key-value pair vectors.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryVectorPairs.test.js`

## First-Response Playbook
1. Capture failing command and full output.
2. Confirm which memory location was selected and which helper was available.
3. Check whether the resolved value is a plain object, array, or scalar before adjusting the projection rule.
4. Add or adjust the toy test so the object-to-pairs shape is pinned down.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
