# Return Tide unavailable-plan notice coverage — 2026-10-26

## Diagnosis

Full Check 40312529134 reported an uncovered runtime branch when the pending Assembly seal plan becomes unavailable at the action-time tide rise. Existing runtime coverage only exercised the successful commitment.

## Fix and evidence

Added a controller-level scenario that advances to the pending state, records the seal as physically destroyed in the active campaign state, advances across the rise, and verifies both the unavailable outcome and its one-shot player notice.

- `npm run check:impact:run -- --files src/core/browser/game/threefold/runtime.js test/core/browser/game/threefold-return-tide-runtime.test.js` — passed 21 suites / 264 tests; runtime has no uncovered lines or branches (100% scoped coverage across statements, branches, functions, and lines).
- `npm run check` — passed all 10 gates.
- `npm run build` — passed.

## Next time

Use the newest exact-head Full Check artifact to identify remaining aggregate coverage gaps. Keep Bead `dadeto-3jh8` open until all four global coverage thresholds pass.
