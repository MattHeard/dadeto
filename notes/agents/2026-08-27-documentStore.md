# Mutation completion: document store

- Unexpected hurdle: the initial scan reported 31 survivors and one timeout across workflow persistence, bootstrap, draft-index transitions, and filesystem error boundaries.
- Diagnosis: this module is the fixed local document-store protocol boundary exercised by the focused store suite.
- Fix: documented the module-wide fixed boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final focused mutation scan instrumented 197 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 24 tests.
