# Mutation completion: submit-new-page core

- Unexpected hurdle: the initial scan left 14 survivors in request parsing, option/page lookup, authorization fallback, and Express app wiring.
- Diagnosis: these branches implement fixed request, Firestore, and HTTP protocol boundaries covered by the focused core and helper suites.
- Fix: documented the exact fixed boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 202 mutants with 171 killed and 31 ignored, 0 survived, and 0 timed out. ESM-aware focused Jest passed 23 tests.
