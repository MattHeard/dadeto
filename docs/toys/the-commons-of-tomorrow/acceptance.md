# Acceptance — The Commons of Tomorrow

## Machine-Checkable Criteria

- [ ] Authored contract test confirms two linked districts, four residents with named values and reasons, three distinct river agreements, evidence-gated seasonal pact, practice options, and charter clauses.
- [ ] Simulation tests cover movement, dialogue, evidence discovery, all three quest resolutions, visible consequences in both maps, practice selection/use, charter recording, and deterministic replay.
- [ ] Opening scene shows June and Elian together during an early flood; flood-marker evidence and each resident's perspective are recorded separately, with only the old gauge unlocking the seasonal pact.
- [ ] Puzzle tests cover a known solution, failed route, bounded/reversible edits, reset, and deterministic repeated advancement without wall-clock access.
- [ ] World-interaction tests verify bridge repair at the footbridge, habitat listening at the field scope, puzzle reset at the maintenance console, and no floating Actions page.
- [ ] Overworld frames show only one bounded contextual HUD line; dialogue and journal retain detailed guidance when opened.
- [ ] Save tests cover independent game identity, versioned three-slot persistence, export/import round trip, malformed import rejection without replacing current state, and save/reload mid-quest.
- [ ] Embedded and dedicated adapters produce equivalent state and 160×144 frame output from the same command sequence.
- [x] Commons tile and sprite generators produce deterministic, game-specific pixel art distinct from Mosslight's terrain and actor palette.
- [ ] Controller tests exercise directions/A/B/X/Y only, B assignment, compact menu ownership, dialogue navigation, and essential actions through world fixtures or resident interactions.
- [ ] Focused Jest and Playwright suites pass; `npm run build` emits the page, game assets, embedded registration and manual.
- [ ] `npm run check` exits 0 before final bead closure.

## Evidence Collection

- Command logs: `.tmp/commons-*` (do not commit generated logs).
- Durable contract and manual routes: this folder's `spec.md`, `harness.md`, and `failure-modes.md`.
- Test reports: focused Jest/Playwright outputs and repository coverage report.
- Record exact commands, statuses and artifact paths in the owning bead.

## Pass/Fail Rules

- Pass only when the three routes preserve distinct, inspectable world outcomes and both entry points replay them identically.
- Fail on moral-score substitution, inaccessible mandatory action, nondeterministic replay, cross-game save acceptance, or a missing acceptance artifact.
