# THREEFOLD Lantern Ward district route

## Unexpected hurdles

- The first action-path draft would have sent Lantern Ward through the Broken Gate reducer, which advances that episode and records gate witness history. Keep authored scenes isolated at the reducer boundary, not only in their renderer and save key.
- At scale +3, the authored homes physically block horizontal movement from the spawn. The scene still has clear north/south movement; tests should assert the authored collision behavior instead of weakening physical bounds.
- The first focused evaluator caught repeated small-world action setup and a duplicate save restore branch. The shared action preparation/commit path now serves the Sluice, Silt Margin, and Lantern Ward, and the duplication gate reports zero clones.

## Diagnosis and fix

The route uses a dedicated Lantern Ward scene ID, a +3 spawn with +4 unlocked, two growth-sensitive buildings, and Mira and Tov as explicitly growth-sensitive residents. The renderer uses the shared Mosslight 160 × 144 surface and eight-pixel grid, labels both buildings and both residents before growth, and keeps A mapped to growth. A Lantern Ward action reducer records only district damage and resident deaths, advances its local elapsed time, and leaves Broken Gate crisis and episode state unchanged. Exports restore the scene under a separate save key.

## Local evidence so far

- `npm run check:impact:run -- --files src/core/browser/game/threefold/lantern-ward.js src/core/browser/game/threefold/simulation.js src/core/browser/game/threefold/renderer.js src/core/browser/game/threefold/save.js src/core/browser/game/threefold/runtime.js src/core/browser/game/threefold/page.js test/core/browser/game/threefold-lantern-ward.test.js test/core/browser/game/threefold-page.test.js` passed 15 suites / 207 tests; all six changed core files have 100% statements, branches, functions, and lines; zero clones.
- The focused Jest command for the two changed page/route suites passed 2 suites / 19 tests after adding assertions that all four authored actors appear in the rendered frame.
- `npm run build` and `npm run manuals:check` passed. Final `npm run check` passed all 10 gates across five all-unit shards (973 suites / 6,808 tests), with zero clones and zero audit vulnerabilities. The first full-check attempt exposed repeated save-code clones; consolidating them also surfaced a Broken Gate restore regression, fixed and covered by the focused evaluator. Exact-head Full Check and Terraform validation remain required before closing Bead `dadeto-sgrn`.

## Next-time guidance

When adding an authored THREEFOLD route, trace the reducer, scene clock, render metadata, save codec, and page adapter together. Test that the shared canvas actually contains each authored actor, not only that preview metadata contains its ID. Reuse small-world action mechanics so a new route does not add another copy of timing and persistence logic.
