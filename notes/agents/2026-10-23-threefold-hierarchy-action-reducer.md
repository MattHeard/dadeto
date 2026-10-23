# THREEFOLD hierarchy action reducer

- Unexpected hurdle: the first API used five positional arguments and the repo's lint rule rejected it; scoped coverage also identified a callback branch that could never occur for the report leaf.
- Diagnosis: a hierarchy action has a stable target set that can be resolved once, while game state is supplied later to a reducer. The Broken Gate report target is a leaf, so a branch for unrelated entity IDs only obscured its effect.
- Chosen fix: expose `createHierarchyActionReducer`, which captures the visible sorted identity set and applies a pure state reducer in order. The real report interaction uses that API after its existing aftermath, reach, integrity, and scale checks.
- Next-time guidance: use a reducer factory when target selection is stable across one action; keep group effect callbacks pure, and test both coarse descendants and fine leaf targets.
- Remaining scope: broader semantic asset/content behaviors and the overall logical-grid acceptance gate remain open.
