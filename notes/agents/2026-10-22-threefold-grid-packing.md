# THREEFOLD deterministic logical-grid packing loop

- Unexpected hurdle: the first changed-core evaluator found repeated overflow and output mapping fragments, incomplete branch coverage, and a helper exceeding the repository's maximum parameter count.
- Diagnosis and fix: extracted shared layout-record and overflow collectors, removed parent-overlap checks made unreachable by holding authored relationship members fixed, and added regressions for invalid containment, oversized capacity, same-group placement, and the final coordinate tie-break.
- Evidence: focused logical-grid Jest passed 1 suite / 43 tests. Changed-core evaluation passed 36 related suites / 549 tests with ESLint, core-parse, zero clones, and no uncovered statements or branches. Direct coverage for `logical-grid.js` is 100% statements, branches, functions, and lines. Repository fast check/build/manual verification is pending.
- Next: integrate packed logical positions into renderer layouts and verify all authored scenes, finite viewport overflow, layering, and unchanged physical/gameplay state. Keep Rank 1 Active / Partial until the full geometry and campaign acceptance pass.
