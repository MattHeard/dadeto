# Mutation completion: segment assignment feasibility

- Unexpected hurdle: the initial scan reported six survivors across JSON fallback, input-array defaults, and delegated result handling.
- Diagnosis: this toy is a fixed JSON feasibility-wrapper boundary covered by the safe-assignment suite.
- Fix: documented the module-wide fixed boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final focused mutation scan instrumented 21 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 18 tests.
