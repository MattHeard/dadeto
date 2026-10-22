# THREEFOLD authored geometry hierarchy propagation

## Loop

Preserved optional parent/child hierarchy metadata through canonical geometry projection and allowed the shared Broken Gate renderer to consume authored metadata. Added a synthetic house→wall regression at coarse and fine scales while retaining the signal-station fallback.

## Unexpected hurdle and diagnosis

- The first changed-core evaluator found only a Prettier warning in the new spatial test assertion. Core parsing, zero-clone duplication, and the 40-suite / 600-test evaluation otherwise passed.
- `projectGeometryForScale` rebuilt projected geometry from an allowlisted set of fields, so hierarchy metadata was dropped before the renderer could see it. The renderer then attached hierarchy only by matching signal-station IDs.

## Fix

- Carry a shallow copy of the optional hierarchy field through projected geometry.
- In the shared Broken Gate render adapter, prefer authored metadata and retain the station map as fallback.
- Test that the synthetic proxy collapses at scale −1 and its child expands at −2 without mutating canonical state; keep the existing station regression.

## Evidence

- Focused `npm run test:impact -- --files test/core/browser/game/threefold-spatial.test.js test/core/browser/game/threefold-renderer.test.js`: 2 suites / 52 tests passed.
- Changed-core evaluator on `spatial.js` and `renderer.js`: 40 suites / 600 tests passed, no uncovered lines or branches, ESLint/core-parse clean, zero clones.
- Direct coverage run over all THREEFOLD suites: 41 suites / 632 tests passed; spatial and renderer files together reported 100% statements (797/797), branches (786/786), functions (225/225), and lines (752/752).
- On clean branch `codex/threefold-authored-hierarchy` based on current `origin/main` (`865ab2731d7864094ce8e17b75d8fcda1de2e504`), the focused impact command passed 2 suites / 52 tests. `npm run check:impact:run -- --files src/core/browser/game/threefold/spatial.js src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-spatial.test.js test/core/browser/game/threefold-renderer.test.js` passed 40 suites / 600 tests, changed-core coverage, ESLint, core-parse, and zero clones. The direct THREEFOLD coverage run passed 41 suites / 632 tests with statements, branches, functions, and lines all at 100% for `spatial.js` and `renderer.js`.
- `DADETO_CHECK_BASE=origin/main DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six serial test shards, with zero clones and zero audit vulnerabilities. `npm run build`, `npm run manuals:check` (79 manuals), and `git diff --check` passed. Exact-head GitHub Full Check and Terraform Validate remain required on the published commit before closing Bead `dadeto-4t0b`.

## Next-time guidance

Keep semantic metadata separate from physical bounds, but preserve it through pure projection. Add a renderer test with non-special-cased entity IDs so it cannot accidentally pass only through a named-scene fallback.

## Follow-up review regression — 2026-10-23

- Unexpected hurdle: geometry projection filtered growth-destroyed objects but retained parent/child metadata that referenced the removed identities. Review demonstrated both a missing-parent failure and an expansion threshold left on a leaf.
- Diagnosis: `exposeHierarchy` correctly rejected the malformed projected tree; the projection boundary needed to reconcile only relationships invalidated by destroyed objects.
- Fix: detach a surviving child only when its original parent was destroyed, and remove a composite threshold only when all of its original children were destroyed. Nested surviving composites and unrelated authored metadata remain unchanged.
- Evidence: focused impact passed 2 suites / 53 tests, including both render-after-destruction cases. Aggregate and exact-head CI results are recorded in the acceptance file after they finish.
