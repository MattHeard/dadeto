# THREEFOLD Weftways renderer packing

## Loop

`createWeftwaysGridLayout` displayed three overlaps at each authored scale (−3 and −2). It now canonicalizes merged scene facets by identity, resolves viewport overflow before packing, and packs only visible projections. The Pell creature and its civic accord target share one intentional display group because they represent the same person at the same authored bounds. The beetle/circle and brazier/bypass pairs are distinct and are packed apart. Canonical geometry and simulation state remain unchanged.

## Unexpected hurdle and diagnosis

- The first changed-core evaluator passed 27 suites / 362 tests, core parsing, and zero-clone duplication, but failed because Prettier warnings count as ESLint failures in this repository. Formatting the renderer resolved the issue.
- The renderer's merged facet order must be canonical before resolving and packing; otherwise reversed authored arrays can alter tie-breaking. Sorting unique entity IDs before layout makes repeat and permutation results identical.
- Off-viewport entities must be filtered before packing and retained as overflow afterward, so the finite-grid solver cannot pull unrelated off-region content into view.

## Evidence

- Focused `npm run test:impact -- --files test/core/browser/game/threefold-weftways.test.js`: 1 suite / 36 tests passed.
- Changed-core `npm run check:impact:run -- --files src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-weftways.test.js`: 27 suites / 362 tests passed; renderer has 100% statements, branches, functions, and lines; ESLint, core parsing, and zero-clone duplication passed.
- Aggregate `npm run check`, build, manuals, diff check, and exact-head CI remain to be run for this branch.

## Next-time guidance

Inspect every baseline overlap before packing. Preserve only identity overlaps with an explicit semantic reason, and pack distinct objects apart without changing physical bounds. Check each authored scale and reversed facet ordering; retain out-of-viewport entities as overflow instead of feeding them to the finite-camera packer.
