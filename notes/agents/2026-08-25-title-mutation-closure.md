# Title mutation closure

- Diagnosis: the static title adapter had no direct focused contract suite;
  generator integration only exercised it indirectly.
- Fix: added exact assertions for accessible banner attributes, ASCII content,
  closing structure, and handle identity.
- Evidence: authoritative per-file Stryker scan instrumented 4 mutants and
  killed all 4 with 0 ignored, 0 survivors, and 0 timeouts. Focused Jest passed
  2 tests and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
