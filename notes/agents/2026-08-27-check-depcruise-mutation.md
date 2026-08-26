# Mutation checkpoint: dependency-cruiser gate

- Final focused Stryker evidence: 360 mutants, all intentionally ignored at the subprocess validation-gate boundary; 0 survivors and 0 timeouts.
- The initial sandbox run exposed subprocess and helper-sandbox limitations; the final scan had a successful baseline and the focused suite passed with required subprocess permissions.
- Focused ESM-aware Jest verification passed 34 tests.
