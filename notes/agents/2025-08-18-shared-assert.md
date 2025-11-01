# Shared assertFunction extraction

- **Surprise:** After extracting `assertFunction`, `npm test` surfaced a failure in `hide-variant-html`. The helper already existed there, but the suite expected `buildVariantPath` to see `variantData: undefined` when no loader result was provided. The implementation returned `null`, so the shared change didn't directly cause it, yet the failing test highlighted that mismatch.
- **Diagnosis:** Re-reading `normalizeRemoveVariantLoadResult` and `resolveVariantData` showed the fall-through path forcing `null`, which contradicted the test expectation. Running the individual spec confirmed the regression and clarified the desired behavior.
- **Adjustment:** Tweaked the normalization helper to keep `variant` `undefined` when the loader omits it, and updated the resolver to return `undefined` in that case. Re-running the focused test and the full suite verified everything was green.
- **Next time:** When centralizing utilities, plan to run a targeted smoke test before the full suite so failures surface faster, then lean on the individual spec to confirm behavior before another 10-minute test run.
