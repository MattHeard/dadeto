# THREEFOLD Failure Modes

## Initial Predicted Failure Classes

- Setup/configuration mismatch: page source exists but the build did not copy the standalone route or core modules.
- Invalid or missing inputs: unsupported action names or malformed imports reach the simulation boundary.
- Dependency/service unavailable: localStorage is denied or quota-limited.
- Non-deterministic timing or ordering: wall-clock callbacks accidentally advance crisis time, or simultaneous controls apply in different orders.
- Environment-specific behavior: pointer capture, gamepad polling, canvas support, or browser storage differs on mobile.
- Interaction regression: a ferry rescue or Latchfolk warning is accepted out of range, after surge, or is lost after save/import; or withdrawal succeeds from outside the road's interaction range.
- Withdrawal regression: the storm clock does not settle to aftermath, prior rescues/warnings are erased, or new world actions remain available after departure.

## Detection Signals

- Error signatures/log lines: browser module import errors, an invalid-save message, or a failed storage operation.
- Observable symptoms: blank frame; actions ignored; tide meter disagrees with crisis progress/stage; crisis stage changing while paused; run returning to the opening state after reload.
- Passenger/ferry state disagrees with the in-range rescue action or deterministic surge transition.
- Latchfolk are safe without a pre-surge warning, or a warning changes ferry/passenger outcomes.
- Mara is marked withdrawn before reaching the upland road, or can still change the world after withdrawal.
- Failing commands: focused Jest path in `harness.md`, `npm run build`, or `npm run check`.

## First-Response Playbook

1. Capture the exact browser action or command and its output.
2. Check generated route files before investigating the renderer.
3. Verify simulation reducers without the page, then check input adaptation and storage injection separately.
4. Keep crisis progression on explicit game commands; pause, menu, and accessibility operations must remain inert.
5. Add a regression test and update this playbook after a failure recurs or reveals a new boundary.
6. For interaction failures, verify target identity, range and pre-surge eligibility independently from input mapping and save normalization; then check that the episode outcomes resolve independently at surge or withdrawal.

## Promoted from Real Failures

- Date: 2026-10-16
- Failure observed: the managed workspace rejected report writes with EROFS during the previous THREEFOLD loop.
- Root cause: the default sandbox exposed the checkout read-only while evaluators needed to write reports.
- Fix implemented: rerun artifact-producing checks with reviewed elevated access.
- Guardrail added (test/doc/harness): use the full check log and coverage summary as explicit evidence; do not treat EROFS as a code failure.
