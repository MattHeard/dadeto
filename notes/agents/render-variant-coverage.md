## Render-variant-core coverage fixes

- **Unexpected hurdle:** Achieving 100% branch coverage required hitting the `data ?? {}` fallback inside `buildVariantObject`, yet `getVisibleVariants` filters on `doc.data().visibility` before the fallback fires. The fix was to stub `doc.data()` so that the first call reports a visibility value (pass the filter) and the second call returns `undefined`, which lets the fallback execute without throwing.
- **Learning:** Branch coverage for `??` expressions often needs the falsy branch exercised explicitly, even if the truthy branch already runs; now I know to simulate repeated accesses or split logic so that the fallback path is reachable without breaking upstream expectations.
- **Next steps/open questions:** None for this change, but future agents should rerun the whole Jest suite (not just the single file) if more coverage gaps appear in other modules so the combined report stays trustworthy.
