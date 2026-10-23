# THREEFOLD scene-authored station hierarchy

## Unexpected hurdles

- The hierarchy source existed in `episode.js` and was injected by `renderer.js`, while the canonical gatehouse geometry and console interactable did not contain it.
- The new worktree did not include `node_modules`, so the focused test runner was unavailable until dependencies were installed.
- A changed-core evaluator then exhausted the 2 GB `/tmp` filesystem because Jest's generated transform cache had grown to 1.6 GB. A second attempt also found several Prettier warnings.
- The first aggregate check found JSDoc type errors: the simulation state is a union of region scenes, so hierarchy requires narrowing to Broken Gate. The changed-core evaluator then identified that this new non-gate path needed a regression test.

## Diagnosis and fix

- Confirmed the split hierarchy through gatehouse, episode, renderer, and copy-helper source inspection.
- Moved the signal-station expansion threshold and console parent link into canonical gatehouse scene data. Scene copies now deep-copy the optional hierarchy value. Renderer and report eligibility consume hierarchy from the scene instead of a parallel station map.
- Added tests that change the authored threshold and verify both visibility and report eligibility follow it. A Tidal Archive regression confirms that scene cannot file a Broken Gate report. Existing tests retain the default −2 threshold and damaged/out-of-range behavior.
- Corrected formatting and cleared the inactive, generated Jest transform cache after confirming no local Jest process was running.

## Evidence and next-time guidance

- Focused impact passed 3 suites / 48 tests.
- Changed-core evaluator passed 36 suites / 524 tests with ESLint, core-parse, zero clones, and no uncovered lines or branches.
- Direct THREEFOLD coverage passed 41 suites / 636 tests. All four metrics were 100% for `scene-utils.js`, `gatehouse.js`, `episode.js`, and `renderer.js`.
- `DADETO_CHECK_BASE=origin/main DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six serial shards (1,006 suites / 7,256 tests). `npm run build`, `npm run manuals:check` (79 manuals), and `git diff --check` passed. Exact-head CI, Bead/Notion update, and publication remain before closing this slice. In fresh worktrees, install dependencies before starting tests; inspect and clear only inactive generated Jest cache if `/tmp` is full.
