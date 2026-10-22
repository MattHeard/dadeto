# THREEFOLD Belltops harbor route

## Unexpected hurdle

- The first shared scene-data draft tripped the repository's parameter-arity rule and introduced clone matches across the repeated district records. The impact evaluator also exposed a JSDoc tuple-type inference issue in shared page controls.
- Beads could not acquire the shared Dolt database lock, so the Belltops contract exists but Bead progress could not be updated in this loop. Do not remove the lock or edit the database manually; retry through `bd` after the current holder releases it.

## Diagnosis and fix

The lint error came from a six-coordinate helper signature. Bounds construction now accepts lower and upper coordinate objects, while structure and resident records use focused constructors. Reordering one authored record group removed the final jscpd clone without changing scene meaning. An explicit `Array<[string, string]>` annotation preserves the selector/text tuple contract for shared high-world controls.

Belltops is represented as authored high-world scene data and uses Lantern Ward's shared reducer, 160 × 144 Mosslight renderer, action clock, preview/commit behavior, and isolated save codec. Its +2 scene contains a watchtower, harbor crane, sentry Orla, and stormbird; the +3 preview identifies the structures and residents affected by growth.

## Evidence

- `npm run check:impact:run -- --files src/core/browser/game/threefold/belltops.js src/core/browser/game/threefold/high-world-scenes.js src/core/browser/game/threefold/lantern-ward.js src/core/browser/game/threefold/page.js src/core/browser/game/threefold/renderer.js src/core/browser/game/threefold/runtime.js src/core/browser/game/threefold/save.js src/core/browser/game/threefold/simulation.js test/core/browser/game/threefold-lantern-ward.test.js test/core/browser/game/threefold-page.test.js` passed: 15 related suites / 208 tests, with 100% changed-core coverage and zero clones.
- `npm run tsdoc:check`, `npm run build`, and `npm run manuals:check` passed; 79 toy manuals validated.
- `npm run check` passed all 10 local gates: 973 suites / 6,809 tests across five impact shards, zero clones, and zero audit vulnerabilities.
- Exact-head GitHub Full Check and Terraform Validate remain to be recorded after push.

## Next-time guidance

- When adding another authored high-world scene, keep only its geometry, residents, scale limits, and copy route-specific; reuse the shared high-world simulation and persistence path.
- Check tuple inference and parameter arity early. Run the duplication gate after shaping scene records so structural repetitions are removed before final validation.
- Retry the Bead update after the Dolt lock becomes available, then record the exact local and CI evidence before closing it.
