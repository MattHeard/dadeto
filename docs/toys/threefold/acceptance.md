# THREEFOLD Acceptance

## Machine-Checkable Criteria

- [x] Focused runtime Jest suite passes for movement, scale controls, deliberate wait, save/reload, reset, and invalid imports.
- [x] `npm run build` exits 0 and produces `public/threefold/index.html`, `public/threefold/game.js`, and `public/core/browser/game/threefold/runtime.js`.
- [x] The standalone HTML declares a 160 × 144 canvas and all mapped handheld controls.
- [x] At the untouched start, the Mosslight frame shows the dock worker's warning and the open-ended goal to investigate the gate; the warning clears after the first timed action.
- [x] Movement and scale attempts accumulate partial Anchor recovery progress; one Anchor returns per 15 in-game minutes, including waits after the crisis reaches aftermath.
- [x] The Mosslight frame shows a tide gauge whose fill reflects elapsed crisis game time and whose color reflects the deterministic crisis stage.
- [x] Damaging the relief gate or counterweight derives a persistent forced-open outcome, warns that the lower channel is at risk before surge, and renders the drainage settlement flooded at surge and aftermath; complete-run save/import preserves the outcome.
- [x] One authored 20.32 cm rat appears in the shared Broken Gate and becomes actionable at scale −2 or −1; the HUD identifies A as fight and X as bypass while in reach.
- [x] Fighting at scale −2 repels the rat; fighting one rung larger at −1 kills it; bypass preserves it. Each outcome advances deterministic game time and persists through save/export/import.
- [x] Schema-v1 runs migrate with the rat still present; malformed schema-v2 encounter state is rejected.
- [x] Local `npm run check` exits 0 with all 10 gates passing and zero clones.
- [x] GitHub Full Check passes for the pushed implementation commit; record its run, tested merge SHA, and artifact.
- [x] `docs/toys/threefold/spec.md`, `harness.md`, `acceptance.md`, `failure-modes.md`, and `manual.md` describe the same implemented control contract.

## Evidence Collection

- Commands: `npm run build`; focused THREEFOLD Jest suite (5 suites, 52 tests); `DADETO_JEST_POOL_DIR=.tmp/rank5-jest-pool DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` (10 gates, 959 suites, 6,596 tests, zero clones). Exact-commit Full Check remains pending.
- Generated page: `public/threefold/`.
- Full coverage report: [Full Check 39260039003](https://github.com/MattHeard/dadeto/actions/runs/39260039003), artifact [12190262026](https://github.com/MattHeard/dadeto/actions/runs/39260039003/artifacts/12190262026). It passed 48/48 coverage shards with 100% statements, branches, functions, and lines globally and for changed files. PR head `f2682207a0603e4daa584c38852d28ea610e8be8` was checked in merge commit `ce9b40eaa6476a7e2cc9d932bb1ade3235bdccdd` against base `e4606bea74809a27a18ed8724e4ef9c6185bf145`.
- Retrospectives: `notes/agents/2026-10-17-threefold-gate-flood-consequence.md` and `notes/agents/2026-10-19-threefold-rat-encounter.md`.

## Pass/Fail Rules

Pass only when every machine-checkable criterion is verified, the user can reach the standalone page, and game actions never use browser wall-clock time. Fail if save/reload loses player or crisis state, or if the frame/control documentation disagrees with runtime behavior.

## Current evidence

- `npm run build` passed and produced the standalone artifacts listed above, including the shared Mosslight-rendered rat sprite.
- The focused THREEFOLD suites passed (5 suites, 52 tests). Local `npm run check` exited 0: all 10 gates passed across five impact shards (959 suites, 6,596 tests), and the clone scanner found zero clones.
- Full Check 39260039003 passed the complete suite (959 suites / 6,596 tests, 48/48 coverage shards) with all four coverage metrics at 100% globally and for changed files. The local fast check alone does not provide coverage evidence.
- The opening warning, partial Anchor recovery, normalized tide gauge, relief-gate flood consequence, and first rat encounter have dedicated focused acceptance entries above. Other NPC outcomes, repair/evacuation choices, a general combat system, physically simulated fluid dynamics, later campaign scenes, and other scales remain outside this playable slice.
- The first rat encounter is implemented as one deterministic choice with fight, bypass, and size-dependent outcomes. A broader combat system, additional creatures, physically simulated fluid dynamics, later campaign scenes, and other scales remain outside this slice.
