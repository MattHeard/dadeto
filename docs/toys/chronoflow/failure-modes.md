# Failure Modes — Chronoflow

## Initial Predicted Failure Classes

- Setup/configuration mismatch: generated page omits a core game asset, or embedded and full-page adapters load different runtime versions.
- Invalid or missing inputs: malformed save/version, command outside the grid, or a level with no valid solution witness.
- Dependency/service unavailable: clock endpoint is offline, slow, cache-stale, or returns an invalid timestamp.
- Non-deterministic timing or ordering: solver reads wall time, commands apply between simulation steps, or fluid updates depend on render frame rate.
- Environment-specific behavior: browser suspension, coarse mobile timer precision, touch event duplication, and floating-point drift across engines.
- Solver instability: negative/over-capacity cells, pressure oscillation, unbounded velocity, or unexplained mass changes.
- Invalid terrain editing: an unmarked/source/target/gate cell changes, edit budget is exceeded, or resetting preserves modified terrain.
- Pressure projection failure: target-grid RMS divergence is reduced by less than 80%, pressure iterations vary by execution order, solid/outer-wall normal velocity appears, or the long closed-field replay drifts in volume or bounds.
- Velocity advection failure: uniform flow changes during interpolation, a transported feature moves against its carrier field, solid-cell values influence a fluid sample, or clamped boundaries produce a non-finite velocity.
- Settled-flow presentation: velocity readout tests inspect only after the fluid has stopped, so no cell remains marked as flowing; assert the live flow affordance during an intermediate fixed-step state and verify completion separately.
- Save/restore failure: version mismatch or malformed arrays are accepted, fluid occupies solid geometry, puzzle progress changes across reload, or saved state restores timed credit without a fresh server-time sample.

## Detection Signals

- Error signatures/log lines: stale/uncertain time status; invalid clock payload; solver invariant failure; replay snapshot mismatch; rejected save schema/rules version.
- Observable symptoms: tide gates jump on reconnect; puzzle phase follows device settings; water slowly appears/disappears in a sealed basin; embedded preview disagrees with full page; a timed result is credited while offline.
- Failing commands: focused Chronoflow Jest suites, `npm run build`, `npm run test:e2e:local`, or `npm run check`.

## First-Response Playbook

1. Capture the exact command, simulation seed/state, ordered commands, clock sample timestamps, round-trip duration, and reported uncertainty.
2. Reproduce with a fixed solver-step sequence and injected clock samples; keep browser timers and network outside core tests.
3. Separate solver failure, clock adapter failure, presentation drift, and environment/network failure before changing code.
4. For projection regressions, use the deterministic 32×20 and 8×6 fields in `test/core/browser/game/chronoflow.test.js`; calculate divergence from outgoing/incoming right/down face velocities, retain the 80% target-grid threshold, and keep the 600-step replay before tuning iteration count.
5. For advection regressions, isolate `advectVelocityField` from the pressure solve using its uniform, carrier-feature, and solid-mask examples before changing solver integration.
4. Add a small regression test or harness fixture and update the owning bead with exact output and artifact paths.

## Promoted from Real Failures

- Date: 2026-10-06
- Failure observed: an epoch sample and its offset estimate could disagree about the reference point within the request window.
- Root cause: the adapter computed offset at the request midpoint but advanced the raw server sample from response completion without accounting for the half-round-trip between those points.
- Fix implemented: advance from the midpoint anchor using half-round-trip uncertainty plus monotonic age, and measure the request through JSON body consumption.
- Guardrail added: deterministic tests assert the sampled offset, uncertainty, and extrapolated epoch together.

- Date: 2026-10-06
- Failure observed: the standalone trusted clock adapter had no deployed endpoint address available to the page.
- Root cause: the Cloud Function URL existed only as Terraform output and was not included in the static runtime configuration read by browser pages.
- Fix implemented: add `chronoflowTimeUrl` to `/config.json`, load it without caching, and show sync/stale/unavailable status plus a phase derived from the server sample.
- Guardrail added: Playwright covers synchronized high-tide credit and unavailable endpoint practice; only the trusted high phase awards a record.
- Timed-credit boundary: the target-fill transition snapshots the injected Internet clock once; only a synchronized reading in the configured high-tide phase grants a timed record. Stale/offline and non-high phases remain puzzle practice.
- Route-choice guardrail: the valve opens exactly one junction branch. The decoy route drains water and blocks the archive approach; resetting restores the initial decoy selection.
- Timed-attempt guardrail: start and command gates require the full estimated epoch uncertainty interval to remain inside high tide. Boundary overlap, stale sync, or offline state pauses timed actions; untimed practice remains available.
- Terrain-edit guardrail: only two authored wall cells are editable, source/target/gate/route cells are protected, every toggle consumes one of three edits, and reset reconstructs the original wall mask.

- Date: 2026-10-06
- Failure observed: clock-sample offset expectations were inconsistent with the measured request midpoint.
- Root cause: offset is `serverEpochMs - (requestStartMs + responseEndMs) / 2`; request latency must be accounted for exactly once.
- Fix implemented: assert the midpoint-derived offset and half-round-trip uncertainty independently for direct samples and injected fetch samples.
- Guardrail added: clock tests use explicit monotonic request brackets and avoid expected values derived from wall time.

- Date: 2026-10-06
- Failure observed: the first browser scenario waited on a generic `#status` element that the page does not define.
- Root cause: the authored page uses `#chronoflow-status` to avoid a generic id and identify the live game status explicitly.
- Fix implemented: point the browser acceptance at the actual status region and complete the sluice, win, and reset journey.
- Guardrail added: keep Playwright selectors aligned with the page's named controls and live status ids.

- Date: 2026-10-06
- Failure observed: binary floating-point arithmetic represents a drained 0.6 - 0.2 as 0.39999999999999997; an exact equality assertion failed.
- Root cause: solver volumes use JavaScript numbers and conservation is approximate to floating-point precision.
- Fix implemented: compare measured volume with a small numeric tolerance; retain exact bounds and accounting invariants.
- Guardrail added: incoming face flux is capacity-limited as well as donor-limited, and a full-column regression checks that a saturated receiver cannot silently lose mass.
