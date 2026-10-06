# Failure Modes — Chronoflow

## Initial Predicted Failure Classes

- Setup/configuration mismatch: generated page omits a core game asset, or embedded and full-page adapters load different runtime versions.
- Invalid or missing inputs: malformed save/version, command outside the grid, or a level with no valid solution witness.
- Dependency/service unavailable: clock endpoint is offline, slow, cache-stale, or returns an invalid timestamp.
- Non-deterministic timing or ordering: solver reads wall time, commands apply between simulation steps, or fluid updates depend on render frame rate.
- Environment-specific behavior: browser suspension, coarse mobile timer precision, touch event duplication, and floating-point drift across engines.
- Solver instability: negative/over-capacity cells, pressure oscillation, unbounded velocity, or unexplained mass changes.

## Detection Signals

- Error signatures/log lines: stale/uncertain time status; invalid clock payload; solver invariant failure; replay snapshot mismatch; rejected save schema/rules version.
- Observable symptoms: tide gates jump on reconnect; puzzle phase follows device settings; water slowly appears/disappears in a sealed basin; embedded preview disagrees with full page; a timed result is credited while offline.
- Failing commands: focused Chronoflow Jest suites, `npm run build`, `npm run test:e2e:local`, or `npm run check`.

## First-Response Playbook

1. Capture the exact command, simulation seed/state, ordered commands, clock sample timestamps, round-trip duration, and reported uncertainty.
2. Reproduce with a fixed solver-step sequence and injected clock samples; keep browser timers and network outside core tests.
3. Separate solver failure, clock adapter failure, presentation drift, and environment/network failure before changing code.
4. Add a small regression test or harness fixture and update the owning bead with exact output and artifact paths.

## Promoted from Real Failures

- Date: 2026-10-06
- Failure observed: none yet; this document starts from predicted risks before gameplay code.
- Root cause: not applicable.
- Fix implemented: not applicable.
- Guardrail added: deterministic state, time-source, offline, and volume invariants are acceptance requirements for upcoming milestones.
