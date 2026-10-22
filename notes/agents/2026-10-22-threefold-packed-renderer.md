# THREEFOLD shared renderer packing

- Unexpected hurdle: `packSceneLayout` returned geometry and diagnostics but not the hierarchy exposure that `createRenderWorld` uses to filter visible identities. The first renderer regression run failed at that boundary.
- Diagnosis: the packing oracle was built on `layoutScene`, which intentionally omits hierarchy. The renderer needs the resolver's visible-identity contract as well as its packed cells.
- Fix: make packing start from `resolveSceneLayout` and retain its hierarchy metadata. The shared world-object projection now uses packed cells for display only. Updated regressions distinguish unresolved physical projection pairs from their packed display positions and confirm authored geometry and growth effects remain unchanged.
- Verification so far: focused impact and changed-core evaluation each passed 36 suites / 549 tests; ESLint, core parsing, zero clones, and the evaluator passed. The first evaluator run caught only a Prettier warning, fixed before the passing run. Whole-repository `npm run check`, build, manuals, and exact-head CI are still pending.
- Next-time guidance: keep each special-region renderer separate until its water/container, actor layering, hierarchy, and interaction semantics have explicit packed-layout tests. Full Rank 1 remains open until those slices and the causal/persistence audit finish.
