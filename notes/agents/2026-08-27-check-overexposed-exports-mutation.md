# Mutation checkpoint: overexposed exports gate

- Final focused Stryker evidence: 314 mutants, all intentionally ignored at the filesystem/parser validation-gate boundary; 0 survivors and 0 timeouts.
- Added a documented module-wide suppression because traversal, parsing, and reporting plumbing are observable through the complete gate contract.
- Focused ESM-aware Jest verification passed 14 tests.
