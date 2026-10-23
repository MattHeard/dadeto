# Tetracube construction acceptance

## Machine-checkable criteria

- [x] `npm run test:impact -- --files test/core/browser/game/tetracube.test.js` passes all 21 model tests.
- [x] `npm run check:impact:run -- --files src/core/browser/game/tetracube/tetracube.js src/core/browser/game/tetracube/world.js src/core/browser/game/tetracube/renderer.js src/core/browser/game/tetracube/page.js test/core/browser/game/tetracube.test.js test/core/browser/game/tetracube-world.test.js test/core/browser/game/tetracube-renderer.test.js test/core/browser/game/tetracube-page.test.js` reports complete changed-core coverage, with lint, core-parse, and zero-clone gates passing.
- [x] `npm run check` exits with status 0 for the current change set.
- [x] `npm run build` exits with status 0 and generates `public/tetracube/`.
- [x] `npm run manuals:check` exits with status 0.
- [x] `git diff --check` exits with status 0 after staging.
- [x] The playable prototype is registered at `/tetracube/` and its four page/world/renderer suites pass.

## Model criteria

- [x] Generate exactly eight canonical free tetracubes; every shape contains four face-connected cells and no two shapes are equivalent under translation and proper cube rotation.
- [x] Enumerate all distinct orientations for each shape from the 24 proper cube rotations.
- [x] Project cells deterministically; reject malformed, overlapping, or otherwise invalid placements without mutating the input structure.
- [x] Drop each valid piece rigidly along the vertical axis until its first ground or piece contact; a single voxel contact supports an overhang.
- [x] Removing support settles affected pieces immediately, including cascades, with no overlap and no remaining downward move.
- [x] Preserve stable piece identity, orientation, and position in state transitions and undo history.

## Evidence collection

- Record exact commands and outcomes in the owning Bead. Store generated test reports under the repository's existing `reports/` paths; do not add transient artifacts to source control.
- Record playtest observations in `docs/toys/tetracube/acceptance.md`, separating observed enjoyment from mechanical correctness.

## Current evidence (2026-10-23)

- The model suite passed 21 tests; the full toy-focused evaluator passed 49 tests, all changed-core statements/branches/functions/lines, ESLint, core parsing, and zero-clone checks.
- The repository fast check passed 7,434 tests across six shards and every static gate. `npm run build` and `npm run manuals:check` also passed.
- The generated standalone route and touch/keyboard controls are in place. No playtest has been recorded yet; observed enjoyment and friction remain open acceptance work.
- Playtest attempt (2026-10-23) is blocked before interaction: this session has no interactive browser-control capability, its browser is currently on Notion, and the repository requires E2E to run in Cloud Run Jobs rather than locally. Static source and unit tests do not establish that the deployed toy loads or that the controls feel usable. The minimum supported next step is an authorized Cloud Run browser job that opens `/tetracube/`, exercises the keyboard/touch controls, and returns a sanitized screenshot/video or interaction log without adding a distinct URL-driven game state.

## Pass/fail rules

The current pure-model loop passes only when every model criterion has automated evidence, changed-core coverage is complete, and required local gates pass. The full Notion spec remains in progress until the browser toy is playable, its first tower/bridge playtest is recorded, and a follow-up design direction is documented.
