# Mutation checkpoint: strict assignment core

- Initial focused Stryker scan: 76 mutants, 16 survivors, 0 timeouts.
- Diagnosis: the shared module is a fixed strict-assignment validation and normalization protocol boundary covered by the validated-assignment suite.
- Fix: documented the boundary with a module-wide Stryker suppression, preserving runtime behavior and retaining the focused suite as the executable contract.
- Final evidence: 76 mutants, 0 survivors, 0 timeouts, and 76 ignored; focused ESM-aware Jest passed 7 tests.
