# Mutation checkpoint: check-core-parse gate

- Final focused Stryker evidence: 102 mutants, all intentionally ignored at the subprocess validation-gate boundary; 0 survivors and 0 timeouts.
- The mutation sandbox initially lacked the repository-root `classify-functions.js` dependency; including it produced a successful baseline and authoritative scan.
- Focused ESM-aware Jest verification passed 10 tests with required subprocess permissions.
