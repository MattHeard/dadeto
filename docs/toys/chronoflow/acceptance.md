# Acceptance — Chronoflow

## Machine-Checkable Criteria

- [x] `npm run check` exits 0 with the repository's 100% lines/statements/functions/branches thresholds intact.
- [x] Solver tests replay the same level plus command stream to identical state snapshots.
- [x] Solver tests verify bounded cell volume/velocity and mass accounting across closed boundaries, sources, drains, and overflow.
- [x] The deterministic pressure projection reduces RMS divergence by at least 80% on the specified 32×20 field, preserves volume and velocity bounds, and enforces impermeable solid and outer faces.
- [x] Semi-Lagrangian velocity advection preserves uniform fields, transports a feature under its carrier flow, and excludes solid-cell values from interpolation.
- [x] Versioned saves restore deterministic board/solver progress as practice, reject malformed or incompatible state, and never retain a clock estimate or timed credit.
- [x] Clock tests use injected server responses and monotonic samples; they verify offset, uncertainty, stale rejection, resync, sleep/resume, and offline practice without reading browser wall time.
- [x] Archive Entry includes an executable deterministic command witness that reaches the target within edit/overflow limits; the decoy route does not fill the target.
- [x] The Archive Entry level's deterministic witness selects the archive route, opens the sluice, reaches the 12% target, and keeps every cell within capacity.
- [x] The junction valve selects between the archive route and decoy drain; the decoy accumulates drained water without filling the target.
- [x] Players can reshape either marked stone cell into a channel within the three-edit budget, and reset restores both cells and the budget.
- [x] Selecting any cell reports solver-backed depth, hydraulic head, and velocity in an accessible readout.
- [x] Time endpoint returns a positive server epoch with no-store/CORS headers, answers preflight, and rejects non-GET requests.
- [x] Clock adapter derives offset and uncertainty from injected monotonic request samples, rejects invalid/slow responses, and expires to stale without reading browser wall time.
- [x] Page loads `chronoflowTimeUrl` from uncached static config and shows Internet tide phase only from the network clock estimate.
- [x] Local Playwright verifies that synchronized high tide grants a timed record and unavailable/offline practice does not.
- [x] A timed attempt cannot start near a phase boundary where clock uncertainty could place the real tide outside high; controls pause when the trusted high window closes.
- [x] Local Playwright can open the sluice, advance water to a win state, and reset to the initial board.
- [x] The embedded toy and full-page runtime produce the same solver state from the same command stream; embedded replay remains untimed practice.
- [x] CHRO1 uses the Mosslight keypad with a persistent, pixelated 160×144 practice screen; directional input selects cells and A/B/X/Y controls edit, route, open, and advance the puzzle.
- [x] `npm run build` emits the Chronoflow page and its runtime assets.
- [x] Local Playwright acceptance opens the page, routes water, verifies trusted high-tide credit, verifies unavailable/offline practice completion, and confirms reset.

## Evidence Collection

- Command logs and reports: `reports/toys/chronoflow/` when created by an owning milestone; do not commit generated logs unless the harness explicitly requires them.
- Durable design and failure guidance: `docs/toys/chronoflow/spec.md`, `failure-modes.md`, `harness.md`.
- Test report path: Jest coverage artifacts under `reports/coverage/` and Playwright report under the configured local E2E output.

## Pass/Fail Rules

- A milestone passes only when its exact criteria are met and its owning bead records command outcomes and artifact paths.
- The game milestone is complete only when timed play demonstrably follows the network clock, offline practice cannot produce timed credit, solver and presentation share deterministic rules, and the full aggregate passes.
- Fail on any implicit browser wall-clock dependency in core, nondeterministic solver replay, unexplained water creation/loss, or timed completion while clock sync is stale.
