# THREEFOLD logical-grid projection loop

- Unexpected hurdle: the existing eight-pixel tests made display alignment look like complete spatial correctness, while source inspection showed fractional world-tile bounds were only snapped after rendering.
- Diagnosis and fix: kept canonical metre bounds intact and added a pure per-scale integer-cell projection with origin `(0, 0)`, nearest-grid-line rounding, ties toward positive infinity, and a one-cell minimum footprint.
- Evidence: focused projection tests passed (1 suite / 6 tests); the changed-core evaluator passed with no uncovered statements or branches and zero clones (all four metrics 100%). After rebase onto current `origin/main`, `npm run check` passed all 10 gates and six shards (7,182 tests), with zero clones and zero audit vulnerabilities; the 79 manuals validated. `npm run build` passed. Exact-head CI remains to be recorded for the committed slice.
- Next: resolve cell conflicts with deterministic packing/hierarchy outcomes and make the renderer consume that layout before adding further gameplay content.

## Deterministic scene classification follow-up

- Unexpected hurdle: project-to-cell support alone did not tell scene consumers whether two objects that snap into the same cells can coexist.
- Diagnosis and fix: added pure `layoutScene` classification with stable identity ordering, pairwise overlap cells, explicit unresolved conflicts, authored containment checks, shared overlap-group allowances, and optional viewport overflow. This reports crowded cells without moving or deleting canonical entities; it is not yet a packing/movement policy.
- Evidence: focused Jest suite passed (1 suite / 12 tests). The first changed-core evaluator run found two ESLint warnings (one overlong function and one test helper signature), then the first `npm run check` found imprecise inferred result-record types. Extracted relationship and overlap classifiers, tightened JSDoc array types, and converted the test helper to a rest-argument signature. The final changed-core evaluator passed ESLint, core-parse, zero clones, and 100% statements, branches, functions and lines. `TMPDIR=/home/matt/dadeto/.git/tmp-logical-grid DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six unit shards; 79 manuals passed, zero clones, zero audit vulnerabilities. `npm run build` passed.
- Next: require deterministic placement/movement policy, semantic proxy/hierarchy resolution, and a renderer consumer with cell geometry assertions before releasing the spatial gate.
