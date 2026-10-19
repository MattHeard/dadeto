# THREEFOLD Acceptance

## Machine-Checkable Criteria

- [x] Focused runtime Jest suite passes for movement, scale controls, deliberate wait, save/reload, reset, and invalid imports.
- [x] `npm run build` exits 0 and produces `public/threefold/index.html`, `public/threefold/game.js`, and `public/core/browser/game/threefold/runtime.js`.
- [x] The standalone HTML declares a 160 × 144 canvas and all mapped handheld controls.
- [x] At the untouched start, the Mosslight frame shows the dock worker's warning and the open-ended goal to investigate the gate; the warning clears after the first timed action.
- [x] Movement and scale attempts accumulate partial Anchor recovery progress; one Anchor returns per 15 in-game minutes, including waits after the crisis reaches aftermath.
- [x] The Mosslight frame shows a tide gauge whose fill reflects elapsed crisis game time and whose color reflects the deterministic crisis stage.
- [x] Damaging the relief gate or counterweight derives a persistent forced-open outcome, warns that the lower channel is at risk before surge, and renders the drainage settlement flooded at surge and aftermath; complete-run save/import preserves the outcome.
- [x] The player can reach the ferry mooring from the start and evacuate passengers before surge; wrong-location and post-surge interactions fail, surge preserves evacuated passengers while losing the ferry, and save/import retains both passenger branches.
- [x] Keyboard, gamepad, and touch controls expose the mooring interaction and all five toy docs describe the same control.
- [x] `npm run check` exits 0 with all 10 gates passing, 100% lines/statements/functions/branches, and zero clones.
- [x] `docs/toys/threefold/spec.md`, `harness.md`, `acceptance.md`, `failure-modes.md`, and `manual.md` describe the same implemented control contract.

## Evidence Collection

- Commands: `npm run build`, the focused THREEFOLD and Mosslight input Jest suites, and `DADETO_CHECK_TIMEOUT_MS=7200000 npm run check`; loop evidence is recorded in Beads.
- Generated page: `public/threefold/`.
- Coverage report: `reports/coverage/coverage-summary.json` (100% statements, branches, functions, and lines for the simulation).
- Retrospective: `notes/agents/2026-10-17-threefold-gate-flood-consequence.md`.

## Pass/Fail Rules

Pass only when every machine-checkable criterion is verified, the user can reach the standalone page, and game actions never use browser wall-clock time. Fail if save/reload loses player or crisis state, or if the frame/control documentation disagrees with runtime behavior.

## Current evidence

- `npm run build` passed and produced the standalone artifacts listed above.
- `DADETO_CHECK_TIMEOUT_MS=7200000 DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exited 0: all 10 gates passed, all coverage shards passed, all 11 local E2E tests passed, coverage was 100% for lines/statements/functions/branches, and the clone scanner found zero clones.
- `reports/coverage/coverage-summary.json` contains the aggregate 100% coverage result. The focused THREEFOLD outcome and renderer tests passed 2 suites and 10 tests.
- The opening warning, partial Anchor recovery, normalized tide gauge, relief-gate flood consequence, and direct passenger rescue have dedicated focused acceptance entries above. NPC behavior, gate repair and settlement evacuation, combat, physically simulated fluid dynamics, later campaign scenes, and other scales remain outside this playable slice.
- 2026-10-19: the seven focused suites passed (101 tests); `npm run build` produced the standalone route and episode module; `npm run check` passed all 10 local gates, including five impact-test shards (955 suites, 6,519 tests) and zero detected clones. This local fast check does not claim full-suite coverage evidence.
