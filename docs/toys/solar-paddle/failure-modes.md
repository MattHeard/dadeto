# Failure Modes: Solar Paddle

## Initial Predicted Failure Classes
- Setup/configuration mismatch: blog entry added but module path not registered.
- Invalid or missing inputs: malformed JSON, missing persisted state, or stale storage data.
- Dependency/service unavailable: no `setLocalPermanentData` helper in the toy environment.
- Non-deterministic timing or ordering: edge-triggered actions repeating on every auto-submit frame.
- Environment-specific behavior: canvas shapes render, but the browser lacks a user-friendly text presenter.

## Detection Signals
- Error signatures/log lines:
  - `SyntaxError` from malformed input parsing.
  - Missing `SOLA1` entry in the blog data.
- Observable symptoms:
  - Paddle does not move.
  - Launch/pause/reset fire repeatedly while a button is held.
  - The orb never returns to the paddle after a missed shot.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-06-28/solarPaddle.test.js`
  - `npm run build`

## First-Response Playbook
1. Capture the failing command and full output.
2. Check whether the failure is parsing, persistence, collision, or rendering.
3. Add or adjust a unit test so the failure stays reproducible.

## Promoted from Real Failures
- Date: 2026-06-28
- Failure observed: none yet
- Root cause: n/a
- Fix implemented: n/a
- Guardrail added (test/doc/harness): Solar Paddle toy docs and focused Jest coverage
