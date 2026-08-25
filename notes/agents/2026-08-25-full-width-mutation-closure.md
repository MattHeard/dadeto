# Full-width mutation closure

- Unexpected hurdle: the existing tests import `src/build` adapters, so the
  initial restricted Stryker file set caused a module-not-found dry-run.
- Diagnosis: direct Jest passed; expanding the scan scope to `src/**/*.js`
  included the adapter dependency and restored a valid mutation run.
- Fix: reused the existing nine focused tests, which cover exact markup,
  structure, boundaries, and integration placement.
- Evidence: final authoritative scan instrumented 4 mutants, killed 2,
  ignored 2 equivalent static placeholder-text mutations, with 0 survivors
  and 0 timeouts. Focused Jest and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
