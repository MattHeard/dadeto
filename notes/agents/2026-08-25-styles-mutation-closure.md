# Styles mutation closure

- Diagnosis: this module is a static CSS template; its focused tests already
  assert the meaningful selectors, declarations, and structural rules.
- Evidence: authoritative per-file Stryker scan instrumented 4 mutants; 1
  killed, 3 documented equivalent static stylesheet-template exclusions, 0
  survivors, and 0 timeouts. Focused Jest passed 7 tests and file-specific
  ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
