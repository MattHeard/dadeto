# Mutation completion: mark-variant-dirty core

- Unexpected hurdle: the initial focused scan left six survivors in request validation, author sentinel parsing, and author response handling.
- Diagnosis: these branches implement fixed request and HTTP protocol shapes already exercised by the focused suites.
- Fix: documented the exact fixed boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 211 mutants with 98 killed and 113 ignored, 0 survived, and 0 timed out. Focused Jest passed 56 tests.
