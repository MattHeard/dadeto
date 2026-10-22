# Hearthgaps logical-grid packing

## Loop

Hearthgaps previously rendered `resolveSceneLayout` diagnostics directly. At scale −1, eight projected identities competed for a 3×2 viewport, leaving collisions visible even though a deterministic layout could fit them. The renderer now packs in-region identities and expands the finite viewport to a 4×3 grid at scale −1. The culvert, its two controls, and Mara share an explicit runoff display group so packing does not break their visible lane relationship. Off-region entities remain overflow; source geometry and interaction state remain canonical.

## Hurdles and diagnosis

- The first focused test run could not find Jest because the new worktree did not have dependencies installed. `npm install` in the worktree restored the runner.
- The first changed-core evaluator reported Prettier warnings and one renderer branch uncovered. Formatting resolved the lint failure. A 3×3 viewport produced 24-pixel cells but an unsnapped vertical origin; regression containment caught the resulting 4-pixel drift. The viewport now uses a 4×3 minimum, and the renderer test derives its cell origin from the same eight-pixel grid. Scale −1 then also covers the larger-home sprite branch.

## Evidence so far

- Focused `npm run test:impact -- --files test/core/browser/game/threefold-renderer.test.js test/core/browser/game/threefold-hearthgaps.test.js`: 2 suites / 43 tests passed.
- Changed-core `npm run check:impact:run -- --files src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-renderer.test.js test/core/browser/game/threefold-hearthgaps.test.js`: 27 related suites / 361 tests passed; renderer statements, branches, functions, and lines have no uncovered entries; ESLint, core parsing, and zero-clone duplication passed.
- `DADETO_CHECK_BASE=origin/main DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six serial all-unit shards. `npm run build` passed; `npm run manuals:check` validated 79 manuals; `git diff --check` passed. Exact-head GitHub checks remain to be recorded before closing the Bead.

## Next-time guidance

When extending a finite grid to fit rendered identities, check both capacity and screen-origin alignment. Preserve visually meaningful scene groups explicitly, and keep off-region overflow out of the packing candidate set so a display layout cannot pull remote objects into view.
