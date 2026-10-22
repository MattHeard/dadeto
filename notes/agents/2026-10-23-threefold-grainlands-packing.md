# Grainlands logical-grid packing

## Loop

`createGrainlandsGridLayout` exposed `resolveSceneLayout` directly, so a finite 18×8 camera displayed unresolved projection overlaps. The renderer now canonicalizes merged scene facets by stable identity, resolves camera overflow first, then packs only in-camera entities. Physical scene bounds, pressure state, gameplay outcomes, and save data remain canonical.

## Hurdles and diagnosis

- Baseline renderer probe found 4 unresolved conflict pairs at scale −4, 4 at −3, 10 at −2 and −1, and 21 at scales 0 through +4. The two nursery entities outside the initial scale −4 camera remained overflow.
- The first changed-core evaluator passed 27 suites / 361 tests but failed ESLint on formatter warnings. After formatting, coverage surfaced comparator arms that could not run for distinct IDs; the implementation now sorts the unique facet IDs with native lexical ordering before resolution and packing, avoiding a redundant output comparator while making layout order stable.
- Reversing all authored facet arrays now produces the same layout at each supported scale. Existing edge-camera, merged-Iru, nursery-water, overflow-omission, and source-immutability assertions remain active.

## Evidence so far

- Focused `npm run test:impact -- --files test/core/browser/game/threefold-grainlands.test.js`: 1 suite / 12 tests passed.
- Changed-core `npm run check:impact:run -- --files src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-grainlands.test.js`: 27 related suites / 361 tests passed; renderer statements, branches, functions, and lines have no uncovered entries; ESLint, core parsing, and zero-clone duplication passed.
- After rebasing onto current main, `DADETO_CHECK_BASE=origin/main DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates; `npm run build` passed; the check validated 79 manuals; and `git diff --check` passed. Exact-head Full Check and Terraform Validate remain pending.

## Next-time guidance

Canonicalize facets before calling the shared packing oracle when a scene combines multiple authored facets into one stable identity. Keep camera overflow separate from in-camera capacity overflow, and check each scale instead of inferring behavior from one crowded fixture.
