# Mutation completion: tree-visibility run

- Unexpected hurdle: the initial scan left three surviving string-literal mutants in the scheduled and HTTP registration calls.
- Diagnosis: the focused tests verified handler behavior but did not assert the exact deployment registration contracts.
- Fix: added assertions for both `europe-west1` registrations, the `every 24 hours` schedule, and the HTTP handler registration.
- Evidence: final focused mutation scan instrumented 9 mutants and killed all 9, with 0 survived and 0 timed out. ESM-aware focused Jest passed 2 tests.
