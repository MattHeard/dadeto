# THREEFOLD Opening Warning Loop

- Unexpected hurdle: the Mosslight frame already supports dialogue panels, but THREEFOLD rendered `dialogue: null` and its objective metadata was not an opening situation the player could see.
- Diagnosis: traced `renderThreefoldFrame` into the shared 160×144 renderer and confirmed crisis elapsed time is deterministic simulation state, so it can gate a one-time opening callout without adding a wall-clock dependency or mutating the save schema.
- Chosen fix: show the dock worker's warning and an open-ended investigation objective only at elapsed game time zero; clear them on the first timed action. Keep the existing controls and crisis rules intact.
- Evidence: focused renderer/runtime Jest suite passed (2 suites, 7 tests); `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed all 10 gates, including coverage-backed unit tests and 11 local E2E tests. The complete run log is `.tmp/threefold-opening-check.log`. The acceptance statement is recorded in `docs/toys/threefold/acceptance.md` and the opening is described in `docs/toys/threefold/manual.md`.
- Next-time guidance: use existing shared Mosslight presentation primitives for episode-specific narrative text, and gate transient opening copy on deterministic game state rather than adding separate presentation lifecycle state.
