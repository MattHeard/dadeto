# Chronoflow grid arity cleanup

- Unexpected hurdle: the first edit removed local width/height bindings but left two interpolation bounds referencing those names; diff review caught the incomplete replacement before testing.
- Diagnosis: `grid` is a cohesive fluid-domain value, while `point` is a coordinate pair. Destructuring grid fields caused the arity rule to expand a legitimate domain record.
- Fix: retain `grid` intact and read width, height, and solid-cell data directly from it; preserve the existing point coordinate handling.
- Evidence: fresh target arity scan is empty; four focused Chronoflow suites passed 49 tests; elevated `npm run check` passed all ten gates. Fresh global inventory is 41 findings across 41 files. Artifact: `.tmp/parameter-bag-global-after-chronoflow.json`.
- Next time: continue with the one finding in `src/core/browser/game/chronoflow/pagePresenter.js`.
