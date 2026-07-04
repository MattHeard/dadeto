# Failure Modes: JSON Parse Error Explainer

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - Jest or repo dependencies are unavailable.
- Invalid or missing inputs:
  - Blank strings, truncated JSON, trailing commas, or incomplete nesting.
- Dependency/service unavailable:
  - None expected; the toy only uses native JSON primitives.
- Non-deterministic timing or ordering:
  - Parse error messages can vary across runtimes, so the location extractor must tolerate multiple message shapes.
- Environment-specific behavior:
  - Some Node versions emit `position N`; others include line/column text.

## Detection Signals
- Error signatures/log lines:
  - `Unexpected token`
  - `Unexpected end of JSON input`
- Observable symptoms:
  - The toy throws instead of returning an error object.
  - Location fields are always null even when the runtime exposes a position.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-04/jsonParseErrorExplainer.test.js`

## First-Response Playbook
1. Capture the exact input and output string.
2. Check whether the runtime error message contains a parse position or line/column pair.
3. Tighten the extractor or tests so the observed failure mode stays reproducible.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
