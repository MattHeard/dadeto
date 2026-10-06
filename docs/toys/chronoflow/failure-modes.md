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
- Failure observed: an epoch sample and its offset estimate could disagree about the reference point within the request window.
- Root cause: the adapter computed offset at the request midpoint but advanced the raw server sample from response completion without accounting for the half-round-trip between those points.
- Fix implemented: advance from the midpoint anchor using half-round-trip uncertainty plus monotonic age, and measure the request through JSON body consumption.
- Guardrail added: deterministic tests assert the sampled offset, uncertainty, and extrapolated epoch together.

- Date: 2026-10-06
- Failure observed: the standalone trusted clock adapter had no deployed endpoint address available to the page.
- Root cause: the Cloud Function URL existed only as Terraform output and was not included in the static runtime configuration read by browser pages.
- Fix implemented: add `chronoflowTimeUrl` to `/config.json`, load it without caching, and show sync/stale/unavailable status plus a phase derived from the server sample.
- Guardrail added: Playwright covers synchronized and unavailable endpoint responses while confirming the level remains untimed practice.

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
