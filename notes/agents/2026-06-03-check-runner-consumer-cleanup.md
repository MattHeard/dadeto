# Check runner consumer cleanup

- Unexpected hurdle: the only remaining `src/core/check-runner.js` consumer was a test helper, not production code.
- Diagnosis path: traced imports with `rg` and confirmed `test/scripts/run-check.test.js` was the sole dependent.
- Chosen fix: moved the test to `src/core/commonCore.js` directly and removed the now-unused test-only export from `src/core/check-runner.js`.
- Next-time guidance: when a wrapper starts looking redundant, check the import graph before keeping it alive for compatibility.
