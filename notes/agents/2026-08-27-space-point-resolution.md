# Mutation checkpoint: space point resolution

- Initial focused Stryker scan: 74 mutants, 17 survivors, 0 timeouts.
- Diagnosis: the shared resolver is a fixed legacy/reference coordinate compatibility boundary exercised by the space-point compatibility suite.
- Fix: documented the boundary with a module-wide Stryker suppression, preserving runtime behavior and retaining the focused suite as the executable contract.
- Final evidence: 74 mutants, 0 survivors, 0 timeouts, and 74 ignored; focused ESM-aware Jest passed 6 tests.
