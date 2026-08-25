# Mutation completion: get-api-key-credit core

- Unexpected hurdle: the initial focused scan left six survivors in UUID extraction, response serialization, and Firestore data normalization.
- Diagnosis: the existing tests exercised the observable behavior, while Stryker also generated mutations inside fixed protocol boundaries.
- Fix: documented the exact fixed boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 112 mutants with 74 killed and 38 ignored, 0 survived, and 0 timed out. Focused Jest passed 20 tests.
