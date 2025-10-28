# Entry/Core vision comment follow-up

## What changed
- Reworked the documentation examples so entry shims pass their dependency factory functions (`buildGcf`, `createBrowserEnv`) into the core layer instead of instantiating them eagerly.
- Added a browser core snippet that demonstrates invoking the factory internally to keep DOM and storage access injectable.

## Challenges
- The original examples implied the entry file owned environment construction, which conflicted with the requested inversion of control. Updating the snippets while keeping them concise required threading the builder pattern through both server and browser sections.

## Verification
- Reviewed the markdown locally to confirm the inline examples compile conceptually and that the new core snippet reinforces the intended dependency injection contract.
