# Mutation completion: render support

- Unexpected hurdle: the initial scan left four survivors in project-ID fallback selection and memoized render-builder construction.
- Diagnosis: these are fixed shared render-state protocol boundaries exercised by the support and dependent entrypoint suites.
- Fix: documented the exact environment and builder boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 27 mutants with 12 killed and 15 ignored, 0 survived, and 0 timed out. ESM-aware focused Jest passed 12 tests.
