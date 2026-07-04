# Failure Modes: JSON Canonicalizer

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - The local Jest runtime is missing or the repo dependencies are not installed.
- Invalid or missing inputs:
  - Malformed JSON, blank input, or non-string payloads.
- Dependency/service unavailable:
  - None expected; the toy only uses native JSON primitives.
- Non-deterministic timing or ordering:
  - Object key order may drift if the canonicalization step does not sort recursively.
- Environment-specific behavior:
  - Some runtimes stringify object keys differently when the input object was mutated before rendering.

## Detection Signals
- Error signatures/log lines:
  - `Unexpected token` from `JSON.parse`
  - Output that changes object key order between runs
- Observable symptoms:
  - Pretty-printed output is not stable.
  - Nested objects remain unsorted.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-04/jsonCanonicalizer.test.js`

## First-Response Playbook
1. Capture the exact input and output string.
2. Confirm whether the failure is parsing, recursive sorting, or formatting.
3. Add or tighten a test for the observed shape before changing the toy again.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
