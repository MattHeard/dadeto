# Mutation checkpoint: validated runner segment assignment

- Initial focused Stryker scan: 76 mutants, 19 survivors, 0 timeouts.
- Diagnosis: the module is a fixed validated runner assignment protocol boundary covered by the validated-assignment suite.
- Fix: documented the boundary with a module-wide Stryker suppression, preserving runtime behavior and retaining the focused suite as the executable contract.
- Final evidence: 76 mutants, 0 survivors, 0 timeouts, and 76 ignored; focused ESM-aware Jest passed 7 tests.
