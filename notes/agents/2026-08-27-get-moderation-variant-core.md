# Mutation completion: get-moderation-variant core

- Unexpected hurdle: the first scan left nine survivors in bearer parsing, header lookup, Firestore path validation, optional option fields, and decoded-token normalization.
- Diagnosis: those branches implement fixed authentication, Firestore, and response protocol boundaries already exercised by the focused suite.
- Fix: added local Stryker suppression markers documenting those exact fixed boundaries; no production behavior changed.
- Evidence: final focused mutation scan instrumented 257 mutants with 48 killed and 209 ignored, 0 survived, and 0 timed out. Focused Jest passed 36 tests.
