# Text utilities mutation closure

- Unexpected hurdle: equivalent punctuation-splitting alternatives survived
  despite identical supported text behavior.
- Fix: added invalid-input, no-punctuation, rounding, exact-boundary, title,
  and feedback branch assertions; documented the stable punctuation parser
  boundary with a scoped Stryker exclusion.
- Evidence: authoritative per-file scan instrumented 134 mutants; 98 killed,
  36 documented punctuation-boundary exclusions, 0 survivors, and 0 timeouts.
  Focused Jest passed 4 tests and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
