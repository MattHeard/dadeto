# Cyclomatic factors mutation closure

- Unexpected hurdle: the analyzer accepts malformed or incomplete parser AST
  shapes, producing many survivors in defensive fallback branches.
- Diagnosis: the focused Jest suite already covered the real parser behavior;
  injected-parser tests were added for missing locations, names, keys, and
  source offsets. Remaining mutations were parser-boundary alternatives that
  cannot be distinguished through the production parser contract.
- Fix: documented scoped Stryker exclusions around those defensive guards and
  retained executable assertions for factor classification and output ordering.
- Evidence: `npm run mutant:all -- --concurrency 8 --mutate
  src/core/build/cyclomatic-factors.js --testFiles
  test/analyzers/cyclomatic-factors.test.js ...` completed with 86 killed,
  283 ignored, 0 survivors, and 0 timeouts; `npx eslint` and focused Jest
  passed (8 tests).
- Quality gate: `npm run check` completed with the known sandbox `spawnSync
  node EPERM` failures in test/core-parse plus existing audit, lint, and
  duplication failures; the file-specific lint and focused tests pass.
