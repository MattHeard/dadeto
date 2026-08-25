# Entrypoint pattern mutation closure

- Unexpected hurdle: the import-count predicate contained conditions already
  implied by the exact core-import and non-core-import counts.
- Diagnosis: focused mutation runs showed those conditions were redundant;
  additional cases were needed for partial direct-execution snippets and
  duplicate core imports.
- Fix: removed the redundant import-count checks and added assertions covering
  valid policy, every failure category, import cardinality, partial snippets,
  and top-level function names.
- Evidence: authoritative per-file Stryker scan instrumented 66 mutants; 49
  killed, 12 documented regex-boundary exclusions, 5 no-coverage, 0 survivors,
  and 0 timeouts. Focused Jest passed 4 tests and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures; entrypoint-pattern itself passed.
