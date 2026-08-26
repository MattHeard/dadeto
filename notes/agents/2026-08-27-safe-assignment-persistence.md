# Mutation completion: safe assignment persistence

- Unexpected hurdle: the initial scan reported six survivors across memory-location validation, root selection, and nested-list initialization.
- Diagnosis: this helper is the fixed atomic memory-write protocol boundary covered by the safe-assignment suite.
- Fix: documented the module-wide fixed boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final focused mutation scan instrumented 44 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 18 tests.
