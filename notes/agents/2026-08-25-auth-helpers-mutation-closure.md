# Auth helpers mutation closure

- Unexpected hurdle: malformed header and decoded-token fallback mutations are
  behaviorally equivalent at the public promise boundary because invalid input
  is intentionally normalized to null.
- Fix: added explicit null decoded payload and undefined-header assertions, and
  documented the two compatibility fallback regions with scoped exclusions.
- Evidence: authoritative per-file Stryker scan instrumented 14 mutants; 10
  killed, 4 documented compatibility exclusions, 0 survivors, and 0 timeouts.
  Focused Jest passed 5 tests and file-specific ESLint passed.
- Quality gate: `npm run check` retained the known sandbox `spawnSync node
  EPERM` failures in test/core-parse plus existing audit, lint, and duplication
  failures.
