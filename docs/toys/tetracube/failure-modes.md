# Tetracube construction failure modes

## Initial predicted failure classes

- Shape enumeration yields duplicates, misses a free tetracube, or includes disconnected cells.
- Rotation normalization reflects a shape or produces duplicate orientations because only proper cube rotations are valid.
- Cell projection order varies, making tests, saves, or previews unstable.
- Invalid placements mutate state or permit two pieces to occupy the same voxel.
- Vertical settling checks only one representative cell and lets another cell pass through support.
- Deletion settling moves a piece through another piece, fails to cascade, or stops in an unstable arrangement.
- Undo restores geometry but changes stable piece identity or the offered-piece state.
- Browser rendering and player movement accidentally impose player-versus-structure collision.
- Browser input drops focus or pointer lock and leaves the player unable to navigate or place pieces.
- Build output omits the standalone route or its runtime dependencies.

## Detection signals

- Exact shape/orientation counts differ from the fixtures or rotation-invariance tests.
- A rejected operation changes serialized state, piece IDs, or occupied-cell sets.
- Settling leaves an overlap or any piece with free space directly beneath all of its cells.
- Focused tests fail in `test/core/browser/game/tetracube.test.js`.
- The generated page is missing, the ghost does not follow the player, or input changes the wrong axis.
- A playtest cannot build a tower/overhang or inspect the result from another viewpoint.

## First-response playbook

1. Capture the failing focused test or browser observation and the exact initial state.
2. Separate canonical shape/orientation, collision, settling, UI input, rendering, and build-route concerns.
3. Add a deterministic regression case at the smallest failing boundary before changing implementation.
4. Rerun the focused evaluator, then `npm run check`; use `npm run check:full` or exact-head CI for authoritative full coverage and browser evidence.
5. Record observed usability and enjoyment separately from correctness.

## Promoted from real failures

- Date: 2026-10-23
- Failure observed: The newly created toy folder contained only a partially filled spec plus two untouched template files, with the acceptance template missing.
- Root cause: The interrupted initial documentation edit did not leave the mandatory four-file set intact.
- Fix implemented: Restore and fill all four required toy documents before beginning mechanics implementation.
- Guardrail added: Verify every `_template` file exists in the new toy folder before treating the first loop as complete.
