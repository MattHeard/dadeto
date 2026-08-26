# Mutation completion: realtime options

- Unexpected hurdle: the initial scan left two survivors in environment and FormData fallback selection, followed by one session-configuration fallback survivor after the first rerun.
- Diagnosis: these are fixed injectable-default boundaries used by the Realtime call adapter.
- Fix: documented the exact fallback boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 40 mutants with 31 killed and 9 ignored, 0 survived, and 0 timed out. Focused Jest passed 9 tests.
