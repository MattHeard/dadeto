# Acceptance — Chronoflow

## Machine-Checkable Criteria

- [ ] `npm run check` exits 0 with the repository's 100% lines/statements/functions/branches thresholds intact.
- [ ] Solver tests replay the same level plus command stream to identical state snapshots.
- [ ] Solver tests verify bounded cell volume/velocity and mass accounting across closed boundaries, sources, drains, and overflow.
- [ ] Clock tests use injected server responses and monotonic samples; they verify offset, uncertainty, stale rejection, resync, sleep/resume, and offline practice without reading browser wall time.
- [ ] Authored levels include a solution witness that reaches the target volume within edit/overflow limits.
- [ ] The Archive Entry level's deterministic witness opens the sluice and reaches the 12% target without exceeding any cell capacity.
- [x] Time endpoint returns a positive server epoch with no-store/CORS headers, answers preflight, and rejects non-GET requests.
- [x] Clock adapter derives offset and uncertainty from injected monotonic request samples, rejects invalid/slow responses, and expires to stale without reading browser wall time.
- [ ] Page loads `chronoflowTimeUrl` from uncached static config and shows Internet tide phase only from the network clock estimate.
- [ ] Local Playwright verifies synchronized tide display and the unavailable/offline practice fallback; the first level remains untimed in both cases.
- [ ] Local Playwright can open the sluice, advance water to a win state, and reset to the initial board.
- [ ] The embedded toy and full-page adapter produce the same solver state from the same command stream.
- [ ] `npm run build` emits the Chronoflow page and its runtime assets.
- [ ] Local Playwright acceptance opens the page, edits a route, completes the untimed level, and shows the stale/offline practice state when the clock endpoint is unavailable.

## Evidence Collection

- Command logs and reports: `reports/toys/chronoflow/` when created by an owning milestone; do not commit generated logs unless the harness explicitly requires them.
- Durable design and failure guidance: `docs/toys/chronoflow/spec.md`, `failure-modes.md`, `harness.md`.
- Test report path: Jest coverage artifacts under `reports/coverage/` and Playwright report under the configured local E2E output.

## Pass/Fail Rules

- A milestone passes only when its exact criteria are met and its owning bead records command outcomes and artifact paths.
- The game milestone is complete only when timed play demonstrably follows the network clock, offline practice cannot produce timed credit, solver and presentation share deterministic rules, and the full aggregate passes.
- Fail on any implicit browser wall-clock dependency in core, nondeterministic solver replay, unexplained water creation/loss, or timed completion while clock sync is stale.
