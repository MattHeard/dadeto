# Failure Modes: Crystal Breaker

## Initial Predicted Failure Classes
- Setup/configuration mismatch: blog entry not wired into the generated build.
- Invalid or missing inputs: malformed JSON, malformed storage, or stale state version.
- Dependency/service unavailable: none expected for the toy itself.
- Non-deterministic timing or ordering: repeated auto-submit frames re-trigger edge actions.
- Environment-specific behavior: canvas text rendering missing in some presenter path.

## Detection Signals
- Error signatures/log lines: thrown JSON parse errors or undefined canvas methods.
- Observable symptoms: HUD text missing, crystal hits not changing state, state growing without bound.
- Failing command(s): `npm run test:unit`, `npm run build`

## First-Response Playbook
1. Capture the failing command and full output.
2. Isolate whether the failure is in the toy, the presenter, or build wiring.
3. Add or adjust a test so the regression is reproducible.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
