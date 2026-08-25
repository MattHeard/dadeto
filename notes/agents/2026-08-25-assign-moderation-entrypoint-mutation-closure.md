# Assign moderation entrypoint mutation closure

- Unexpected hurdle: the first scan left four lifecycle mutants alive because
  the existing integration test did not assert initialization idempotence or
  cache-reset state.
- Fix: asserted one-time initialization, explicit reset behavior, and the
  post-reset initialization-state value.
- Evidence: authoritative per-file Stryker scan instrumented 29 mutants and
  killed all 29 with 0 ignored, 0 survivors, and 0 timeouts. Focused Jest
  passed 1 test and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
