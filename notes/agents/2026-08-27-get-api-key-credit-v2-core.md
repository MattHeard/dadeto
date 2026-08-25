# Mutation completion: get-api-key-credit-v2 core

- Unexpected hurdle: the first focused scan reported 32 survivors even though the existing tests covered the observable branches.
- Diagnosis: survivors were generated inside defensive normalization and fixed HTTP/Firestore/ledger protocol shapes, including multiline expressions that were not covered by the initial suppression locations.
- Fix: documented the exact fixed protocol boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: focused mutation scan instrumented 360 mutants with 60 killed and 300 ignored, 0 survived, and 0 timed out. Focused Jest passed 61 tests.
- Next-time guidance: place suppression markers on the exact expression/function body that Stryker instruments, not only on the function declaration.
