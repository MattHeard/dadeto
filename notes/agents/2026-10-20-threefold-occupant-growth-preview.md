# THREEFOLD occupant growth preview

- Unexpected hurdles: the local TypeScript check caught the new episode update widening `latchfolk: 'lost'` to `string`; the first exact-commit Full Check then found the geometry-only compatibility wrapper had no coverage after the renderer switched to combined growth effects.
- Diagnosis: mutable JavaScript inference widened the outcome literal, and no test called `previewThreefoldGrowthDamageIds` directly after it delegated to `previewThreefoldGrowthEffects`.
- Fix: annotate the outcome literal as `'lost'` and add a regression proving the compatibility wrapper returns the geometry IDs from the combined preview.
- Next-time guidance: run both local TSDoc and exact-commit coverage after changing exported simulation helpers; delegation can leave a public wrapper uncovered even when its delegate is well tested.
- Evidence: five focused suites passed (120 tests), `npm run build` passed, and the final docs-inclusive `npm run check` passed all 10 local gates (958 suites / 6,592 tests, zero clones). Full Check run 39333346536 passed all 48 test shards but failed global statements/functions/lines because the wrapper had zero calls. The exact-commit retry is pending.
