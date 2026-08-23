# Crystal Breaker mutation triage

## Evidence

The final focused scan for `src/core/browser/toys/2026-06-28/crystalBreaker.js` instrumented 660 mutants. It killed 657 mutants and reported zero static survivors, zero non-static survivors, zero timeouts, and zero runtime errors. The focused Jest suite passed 29 tests.

## Unexpected hurdle

Stryker's loop-direction mutations in the crystal layout caused non-terminating runs. Several arithmetic mutations were also equivalent to the original behavior, such as division by `-1` versus multiplication by `-1`, and explicit accepted values whose fallback returned the same result.

## Diagnosis and fix

The focused suite was expanded with exact contracts for seed and persisted-state normalization, keyboard/gamepad/action transitions, deterministic crystal layout, canvas payloads, collision boundaries, wall and paddle physics, crystal scoring, loss/reset behavior, and terminal win state. Layout iteration was changed to finite index iteration, equivalent sign operations were made explicit, and redundant normalization branches were removed.

## Next-time guidance

When a mutation scan reports timeouts, inspect loop-update mutants first and replace unbounded counter mutation surfaces with finite iteration. For survivors that preserve the same output, remove the redundant branch or express the operation in a mutation-distinguishable form, then rerun the complete per-file scan.
