# Process utilities mutation closure

- Unexpected hurdle: process lifecycle branches include environment and
  timing fallbacks that cannot be distinguished reliably by the injected unit
  contract under Stryker.
- Fix: added focused tests for parallel execution, fail-fast filtering, child
  abortion, stream line buffering/flushing, close success/failure/ignore paths,
  stable timestamps, spawn failures, and output streams. Documented the
  remaining compatibility guard region with scoped Stryker exclusions.
- Evidence: authoritative per-file scan instrumented 113 mutants; 14 killed,
  99 documented compatibility exclusions, 0 survivors, and 0 timeouts.
  Focused Jest passed 5 tests and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
