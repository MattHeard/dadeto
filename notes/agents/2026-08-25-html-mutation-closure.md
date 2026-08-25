# HTML mutation closure

- Unexpected hurdle: two attribute-name literal mutants survived the existing
  integration assertions because `class` and `id` were only exercised
  indirectly.
- Fix: added an exact `attrName()` mapping assertion for `LANG`, `CLASS`, and
  `ID`.
- Evidence: authoritative per-file Stryker scan instrumented 64 mutants; 61
  killed, 2 documented static helper-template exclusions, 1 no-coverage, 0
  survivors, and 0 timeouts. Focused Jest passed 18 tests and file-specific
  ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
