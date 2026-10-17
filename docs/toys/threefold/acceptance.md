# THREEFOLD Acceptance

## Machine-Checkable Criteria

- [x] Focused runtime Jest suite passes for movement, scale controls, deliberate wait, save/reload, reset, and invalid imports.
- [x] `npm run build` exits 0 and produces `public/threefold/index.html`, `public/threefold/game.js`, and `public/core/browser/game/threefold/runtime.js`.
- [x] The standalone HTML declares a 160 × 144 canvas and all mapped handheld controls.
- [x] At the untouched start, the Mosslight frame shows the dock worker's warning and the open-ended goal to investigate the gate; the warning clears after the first timed action.
- [x] Movement and scale attempts accumulate partial Anchor recovery progress; one Anchor returns per 15 in-game minutes, including waits after the crisis reaches aftermath.
- [x] The Mosslight frame shows a tide gauge whose fill reflects elapsed crisis game time and whose color reflects the deterministic crisis stage.
- [x] `npm run check` exits 0 with all 10 gates passing, 100% lines/statements/functions/branches, and zero clones.
- [x] `docs/toys/threefold/spec.md`, `harness.md`, `acceptance.md`, `failure-modes.md`, and `manual.md` describe the same implemented control contract.

## Evidence Collection

- Commands: `npm run build`, the focused THREEFOLD Jest suite, and `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check`; loop evidence is recorded in Beads.
- Generated page: `public/threefold/`.
- Coverage report: `reports/coverage/coverage-summary.json` (100% statements, branches, functions, and lines for the simulation).
- Retrospective: `notes/agents/2026-10-16-threefold-anchor-recovery.md`.

## Pass/Fail Rules

Pass only when every machine-checkable criterion is verified, the user can reach the standalone page, and game actions never use browser wall-clock time. Fail if save/reload loses player or crisis state, or if the frame/control documentation disagrees with runtime behavior.

## Current evidence

- The focused runtime suite and fresh full check pass in `.tmp/w9z7-focused-test.log` and `.tmp/threefold-acceptance-doc-check.log`; the full check reports 10/10 gates, 0 clones, and 100% lines, statements, functions, and branches in `reports/coverage/coverage-summary.json`.
- Fresh `npm run build` output is recorded in `.tmp/w9z7-build.log`; it produced the three standalone artifacts listed above, and all are present under `public/`.
- The opening warning, partial Anchor recovery, and normalized tide gauge have dedicated focused acceptance entries above. NPC outcomes, repair/evacuation choices, combat, later campaign scenes, and other scales remain outside this playable slice.
