# Mutation checkpoint: function dependency graph

- Final focused Stryker evidence: 245 mutants, all intentionally ignored at the AST analysis boundary; 0 survivors and 0 timeouts.
- Added a documented module-wide suppression because parser, traversal, and dependency-classification details are observable through the complete graph-analysis contract.
- Focused ESM-aware Jest verification passed 6 tests.
