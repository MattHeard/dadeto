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
- [x] The player can reach the Latchfolk watchkeeper from the start and warn them before surge; out-of-range and post-surge warnings fail, warned residents reach safety while unwarned residents are lost, independent of ferry outcomes; save/import preserves the warning and outcome and migrates older episode saves.
- [x] Keyboard, gamepad, and touch controls expose the warning/rescue interaction and all five toy docs describe the same control.
- [x] `npm run check` exits 0 with all 10 fast local gates passing and zero clones.
- [ ] The matching GitHub `check:full` run passes the full suite and verifies 100% lines/statements/functions/branches.
- [x] `docs/toys/threefold/spec.md`, `harness.md`, `acceptance.md`, `failure-modes.md`, and `manual.md` describe the same implemented control contract.

## Evidence Collection

- Commands: `npm run build`, `npm run test:impact`, `DADETO_CHECK_TIMEOUT_MS=7200000 npm run check`, and the matching GitHub `check:full` workflow; loop evidence is recorded in Beads.
- Generated page: `public/threefold/`.
- Coverage report: `reports/coverage/coverage-summary.json`, produced by the matching GitHub `check:full` workflow.
- Retrospective: `notes/agents/2026-10-17-threefold-gate-flood-consequence.md`.

## Pass/Fail Rules

Pass only when every machine-checkable criterion is verified, the user can reach the standalone page, and game actions never use browser wall-clock time. Fail if save/reload loses player or crisis state, or if the frame/control documentation disagrees with runtime behavior.

## Current evidence

- `npm run build` passed and produced the standalone artifacts listed above.
- The previously recorded full-check evidence belongs to an earlier implementation commit; the current matching `check:full` run is pending.
- `DADETO_CHECK_TIMEOUT_MS=7200000 npm run check` exited 0 with all 10 fast local gates passing. Its five impact shards passed 956 suites; this local check does not provide full-suite coverage evidence.
- The opening warning, partial Anchor recovery, normalized tide gauge, relief-gate flood consequence, direct passenger rescue, and warning-triggered Latchfolk safety branch have dedicated focused acceptance entries above. Autonomous NPC schedules, gate repair and other settlement interactions, combat, physically simulated fluid dynamics, later campaign scenes, and other scales remain outside this playable slice.
- 2026-10-19: the seven focused suites passed (101 tests); `npm run build` produced the standalone route and episode module; `npm run check` passed all 10 local gates, including five impact-test shards (955 suites, 6,519 tests) and zero detected clones. This local fast check does not claim full-suite coverage evidence.
- 2026-10-19: Latchfolk warning branch added; `npm run test:impact` passed all five fallback shards (956 suites), `npm run check` passed all 10 gates, and `npm run build` passed. Matching GitHub `check:full` evidence is pending for the implementation commit.
