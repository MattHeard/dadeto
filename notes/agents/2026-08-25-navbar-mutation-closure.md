# Navbar mutation closure

- Diagnosis: the small static adapter had no direct focused contract suite;
  header integration only exercised it indirectly.
- Fix: added exact assertions for every filter option and active state, all
  external URLs and their `_blank`/`noopener` attributes, and the wrapper
  handle's exported functions.
- Evidence: authoritative per-file Stryker scan instrumented 6 mutants and
  killed all 6 with 0 ignored, 0 survivors, and 0 timeouts. Focused Jest passed
  3 tests and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
