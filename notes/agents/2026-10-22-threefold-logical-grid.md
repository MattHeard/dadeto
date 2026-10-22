# THREEFOLD logical-grid projection loop

- Unexpected hurdle: the existing eight-pixel tests made display alignment look like complete spatial correctness, while source inspection showed fractional world-tile bounds were only snapped after rendering.
- Diagnosis and fix: kept canonical metre bounds intact and added a pure per-scale integer-cell projection with origin `(0, 0)`, nearest-grid-line rounding, ties toward positive infinity, and a one-cell minimum footprint.
- Evidence: focused projection tests passed (1 suite / 6 tests); the changed-core evaluator passed with no uncovered statements or branches and zero clones (all four metrics 100%). After rebase onto current `origin/main`, `npm run check` passed all 10 gates and six shards (7,182 tests), with zero clones and zero audit vulnerabilities; the 79 manuals validated. `npm run build` passed. Exact-head CI remains to be recorded for the committed slice.
- Next: resolve cell conflicts with deterministic packing/hierarchy outcomes and make the renderer consume that layout before adding further gameplay content.
