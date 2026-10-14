# Update variant visibility AllowEffects audit

## Findings

The trigger is registered behind the startup capability, and the Firestore trigger boundary mints a fresh capability per invocation. Firestore reads and render-contents calls receive the invocation capability where they perform command effects. Variant stats and admin-lock writes use the permission-first Firestore adapter. The audit found that `src/core` still received raw Firestore and DocumentReference SDK types, exposing `.update()` as a direct bypass despite current code using the adapter. Core now uses read-only structural Firestore, reference, and snapshot types; only the external cloud adapter casts the opaque reference to its writable shape and invokes `.update()`.

## Evidence

- Focused tests: 4 suites, 46 tests passed.
- `npm run tsdoc:check`: passed after the type narrowing.
- `npm run check`: passed all 10 gates, including coverage, lint, dependency checks, and zero clones.
- `npm run build:cloud`: passed.

## Next step

This was the final lexicographic `src/cloud/*/index.js` entrypoint. The source-cloud audit pass is complete. Continue with the next ready specification, Automated Query Performance Testing.

## Retrospective

- Unexpected hurdle: the permission-first write adapter was used correctly, but the core-facing raw Firestore types still exposed command methods.
- Diagnosis: traced all reads and writes in the trigger handler and checked SDK types at every core boundary.
- Chosen fix: narrow core-facing types to read operations and keep the writable reference cast inside the cloud adapter.
- Next time: inspect type capabilities as well as actual method calls when reviewing effect boundaries.
