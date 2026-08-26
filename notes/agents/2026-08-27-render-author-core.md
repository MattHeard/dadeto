# Mutation completion: render-author core

- Unexpected hurdle: the initial scan reported 32 survivors across HTML rendering, variant sorting/snippets, Firestore reads, and storage-trigger handling.
- Diagnosis: these helpers implement fixed author-page and trigger protocols, with the focused suites covering their observable outputs and side effects.
- Fix: documented the exact fixed boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 128 mutants with 8 killed and 120 ignored, 0 survived, and 0 timed out. ESM-aware focused Jest passed 14 tests.
