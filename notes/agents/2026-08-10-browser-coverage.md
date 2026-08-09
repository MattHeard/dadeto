# Browser coverage completion

- Unexpected hurdle: the aggregate coverage runner stalled on open handles and
  the final browser file retained an uncovered inline default callback.
- Diagnosis: running the full shard runner with subprocess permission and
  `--forceExit` produced a fresh aggregate report; the only remaining
  `src/core` scope was `src/core/browser/admin-core.js`.
- Fix: added tests covering Firebase-token, cached-token, author-regeneration,
  error-reporting, and init-app paths. Made the optional render error reporter
  explicitly optional so the no-op default is not an untestable inline
  function.
- Evidence: `DADETO_COVERAGE_SHARD_SIZE=64 npm run test:unit` completed all
  shards with passing tests; the final `reports/coverage/coverage-final.json`
  audit found no `src/core` file below 100% for statements, branches,
  functions, or lines.
