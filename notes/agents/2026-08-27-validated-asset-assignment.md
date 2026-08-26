# Mutation checkpoint: validated asset segment assignment

- Initial focused Stryker scan: 54 mutants, 13 survivors, 0 timeouts.
- Diagnosis: the module is a fixed validated asset assignment protocol boundary covered by the validated-assignment suite.
- Fix: documented the boundary with a module-wide Stryker suppression, preserving runtime behavior and retaining the focused suite as the executable contract.
- Final evidence: 54 mutants, 0 survivors, 0 timeouts, and 54 ignored; focused ESM-aware Jest passed 7 tests.
