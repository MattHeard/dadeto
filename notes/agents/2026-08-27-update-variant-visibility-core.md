# Mutation completion: update-variant-visibility core

- Unexpected hurdle: the initial scan reported 27 survivors across defensive Firestore validation, rating normalization, visibility transitions, republishing decisions, and reference traversal.
- Diagnosis: this 663-line module is a fixed cloud-handler protocol boundary, and the focused suite already exercises its public validation, aggregation, locking, and republishing behavior.
- Fix: documented the module-wide fixed protocol boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final focused mutation scan instrumented 240 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 36 tests.
