# THREEFOLD authored gate-repair scale

## Unexpected hurdle

- The gate repair's exact required scale was embedded in episode logic, while the target interaction itself was canonical scene data. The first changed-core run also caught a missing JSDoc entry after its test helper gained an optional scene parameter.

## Diagnosis and fix

- Added `interactionScale` to the canonical locking-pawl interactable and preserved it in scene copies. `attemptThreefoldGateRepair` now reads that exact requirement from the Broken Gate scene; a non-Broken-Gate state returns unchanged.
- Kept the default at scale −2. A regression changes the authored value to −1 and proves that the real repair action follows it, while existing tests preserve the default wrong-scale, reach, crisis, ferry, damage, and persistence behavior.
- Added the missing helper JSDoc parameter after the scoped evaluator identified it.

## Evidence and next-time guidance

- Focused impact passed 2 suites / 16 tests; `npm run tsdoc:check` passed.
- Changed-core evaluator passed 35 suites / 513 tests with ESLint, core-parse, zero clones, and no uncovered lines or branches.
- Direct THREEFOLD coverage passed 41 suites / 638 tests, with all four metrics at 100% for `episode.js`, `gatehouse.js`, `renderer.js`, and `scene-utils.js`.
- Aggregate check, build/manuals, exact-head CI, and Bead/Notion closure remain. Check existing scene metadata for the intended exact-vs-threshold semantics before generalizing a gameplay rule.
