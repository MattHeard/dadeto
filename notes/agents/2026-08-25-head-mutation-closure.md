# Head mutation closure

- Unexpected hurdle: none in the source; the existing focused suite exercises
  the complete small template adapter.
- Diagnosis and fix: verified the current metadata, stylesheet, interactive
  script, closing tag, and exported-handle contracts with the existing tests.
- Evidence: authoritative per-file Stryker scan instrumented 4 mutants, killed
  2, ignored 2 equivalent static template-text mutations, with 0 survivors
  and 0 timeouts. Focused Jest passed 3 tests and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
