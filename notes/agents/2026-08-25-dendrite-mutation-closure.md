# Dendrite mutation closure

- Unexpected hurdle: this deployment adapter had no dedicated unit test.
- Diagnosis: its behavior is fully dependency-injected, so a deterministic
  fake filesystem could exercise both missing-source and recursive-copy paths.
- Fix: added focused assertions for path resolution, recursive directory
  creation, file copies, `withFileTypes`, and all deployment log messages.
- Evidence: authoritative per-file Stryker scan instrumented 27 mutants and
  killed all 27 with 0 survivors and 0 timeouts; focused Jest passed 2 tests;
  file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures; targeted lint and tests pass.
