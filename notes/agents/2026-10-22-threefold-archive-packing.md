# THREEFOLD Tidal Archive packing

- Unexpected hurdle: the first renderer test run still expected unresolved overlap diagnostics. Once the Archive began consuming packed cells, it correctly returned no conflicts for the fixtures with enough viewport capacity.
- Diagnosis and fix: those expectations described the old diagnostic-only renderer. Updated them to assert placed, non-overlapping display cells and added reversed-input stability while retaining checks that chamber-fluid bounds match and solver state remains unchanged.
- Verification so far: focused impact passed 28 suites / 370 tests. Changed-core evaluation passed 28 suites / 370 tests with renderer coverage at 100%, clean ESLint/core parsing, and zero clones. Two evaluator attempts caught a max-statements and then a Prettier warning in the test; both were fixed before the passing run. Repository fast check, build, manuals, and exact-head CI remain pending.
- Next-time guidance: for each specialized scene, keep water levels and action outcomes in the physical model; pack only its display layout. Re-check authored containers, actor layering, scale thresholds, and save behavior before marking a scene complete.
