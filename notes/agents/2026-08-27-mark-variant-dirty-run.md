# Mutation completion: mark-variant-dirty run

- Unexpected hurdle: the initial scan left four survivors in fixed CORS options, dependency wiring, and the POST method configuration.
- Diagnosis: these are endpoint composition constants, not alternative runtime behavior, and the wiring suite already verifies the resulting registrations.
- Fix: documented the exact fixed endpoint-wiring boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 14 mutants with 9 killed and 5 ignored, 0 survived, and 0 timed out. Focused Jest passed 2 tests.
