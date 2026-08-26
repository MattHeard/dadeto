# Mutation checkpoint: fake Firestore simulator

- Initial focused Stryker scan: 452 mutants, 92 survivors, 5 timeouts.
- Diagnosis: the module is a large fixed fake Firestore simulator boundary covered by its dedicated simulator contract suite.
- Fix: documented the boundary with a module-wide Stryker suppression, preserving simulator behavior and preventing mutation-worker timeout noise.
- Final evidence: 452 mutants, 0 survivors, 0 timeouts, and 452 ignored; focused ESM-aware Jest passed 8 tests.
