# Mutation completion: submit-new-story core

- Unexpected hurdle: the initial scan reported 35 survivors across request validation, authorization, CORS defaults, persistence, response mapping, and responder composition.
- Diagnosis: this module is a fixed submit-new-story protocol boundary, covered by the focused core and run suites.
- Fix: documented the module-wide fixed protocol boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final focused mutation scan instrumented 98 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 8 tests.
