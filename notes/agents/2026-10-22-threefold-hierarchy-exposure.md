# THREEFOLD semantic hierarchy exposure

## Unexpected hurdle

The first focused evaluator found a six-parameter recursive helper, which violated the repository's arity rule. After moving recursion into a closure, the fast aggregate completed all six serial unit shards but failed TSDoc because the closure arrays and parameters lacked explicit JSDoc types; two validated map lookups also needed narrowing.

## Diagnosis and fix

Keep recursive state local to `exposeHierarchy` rather than packing it into an options object. Give the result collections and closure parameters explicit JSDoc types, and narrowly cast map values only after graph validation establishes that the keys exist. Add a multiple-proxy case so stable ordering is exercised.

## Evidence

- `npm run check:impact:run -- --files src/core/browser/game/threefold/logical-grid.js test/core/browser/game/threefold-logical-grid.test.js` — passed 28 related suites / 352 tests, ESLint, core-parse, zero clones, and 100% statements, branches, functions, and lines for `logical-grid.js`.
- `npm run tsdoc:check` — passed after the JSDoc correction.
- The first `npm run check` completed all six serial impact shards, then failed only `tsdoc:check`; after the type fix, `npm run check -- --skip-tests` passed all 10 static gates. The earlier run's `manuals:check` validated 79 manuals.
- `npm run build` — passed.
- `git diff --check` — passed.

## Next-time guidance

Use closure state for private recursive traversal when it reduces helper arity. Run TSDoc early for new JSDoc-checked core APIs, before spending time on a docs-inclusive aggregate whose impact selector falls back to all unit shards.

The API remains an uncalled identity-selection primitive. Layout composition, renderer integration, and feature-specific authored hierarchies remain part of Rank 1 acceptance.
