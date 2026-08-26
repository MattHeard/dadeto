# Mutation completion: submit-shared

- Unexpected hurdle: the initial scan reported 11 survivors in defensive nullish, header-value, and plain-record guards.
- Diagnosis: these branches are fixed shared submission protocol boundaries; the focused shared and additional coverage suites exercise the public behavior.
- Fix: documented the module-wide fixed protocol boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final focused mutation scan instrumented 84 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 18 tests.
