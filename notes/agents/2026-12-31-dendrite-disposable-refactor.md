# Dendrite handler disposable reuse

- Identified that `createDendriteHandler` duplicated the `_dispose` guard already available via `isDisposable` in `disposeHelpers`. Reused the helper to keep the logic consistent across input handlers.
- Jest suite currently has a pre-existing failure in `test/core/cloud/hide-variant-html/removeVariantHtml.test.js` (expects `variantData` to be `undefined` but receives `null`). Logged it here so it can be investigated separately.
