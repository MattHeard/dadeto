# THREEFOLD Failure Modes

## Initial Predicted Failure Classes

- Setup/configuration mismatch: page source exists but the build did not copy the standalone route or core modules.
- Invalid or missing inputs: unsupported action names or malformed imports reach the simulation boundary.
- Dependency/service unavailable: localStorage is denied or quota-limited.
- Non-deterministic timing or ordering: wall-clock callbacks accidentally advance crisis time, or simultaneous controls apply in different orders.
- Environment-specific behavior: pointer capture, gamepad polling, canvas support, or browser storage differs on mobile.

## Detection Signals

- Error signatures/log lines: browser module import errors, an invalid-save message, or a failed storage operation.
- Observable symptoms: blank frame; actions ignored; tide meter disagrees with crisis progress/stage; crisis stage changing while paused; rat prompt appearing outside reach or failing to appear at scale −2/−1; rat fate returning to present after reload; run returning to the opening state after reload.
- Failing commands: focused Jest path in `harness.md`, `npm run build`, or `npm run check`.

## First-Response Playbook

1. Capture the exact browser action or command and its output.
2. Check generated route files before investigating the renderer.
3. Verify simulation reducers without the page, then check input adaptation and storage injection separately.
4. Keep crisis progression on explicit game commands; pause, menu, and accessibility operations must remain inert.
5. Add a regression test and update this playbook after a failure recurs or reveals a new boundary.

## Rat encounter checks

- Confirm Mara is at scale −2 or −1 and physically within reach of the authored rat before expecting A/Fight or X/Bypass prompts.
- If A grows while the player expects a fight, or X waits while the player expects to pass the rat, check the canonical position, scale, and encounter fate supplied to the frame.
- If a rat fate changes after reload, test both schema-v1 migration and schema-v2 roundtrip in `threefold-save.test.js` before investigating the browser storage adapter.

## Promoted from Real Failures

- Date: 2026-10-16
- Failure observed: the managed workspace rejected report writes with EROFS during the previous THREEFOLD loop.
- Root cause: the default sandbox exposed the checkout read-only while evaluators needed to write reports.
- Fix implemented: rerun artifact-producing checks with reviewed elevated access.
- Guardrail added (test/doc/harness): use the full check log and coverage summary as explicit evidence; do not treat EROFS as a code failure.
