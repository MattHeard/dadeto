# Mutation completion: segment maximum speed feasibility

- Unexpected hurdle: the initial scan reported seven survivors across input defaults, candidate resolution, and speed calculation branches.
- Diagnosis: this toy is a fixed distance, duration, and maximum-speed validation protocol boundary covered by the safe-assignment suite.
- Fix: documented the module-wide fixed boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final focused mutation scan instrumented 45 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 18 tests.
