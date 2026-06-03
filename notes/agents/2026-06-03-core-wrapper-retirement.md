# Core wrapper retirement

- Unexpected hurdle: the remaining `src/core` wrappers looked like they might still have active consumers, but the import graph showed only one test and one build adapter path.
- Diagnosis path: traced imports with `rg` and confirmed `test/scripts/run-check.test.js` was the only `check-runner` consumer, while `src/core/build/copy-cloud.js` was the only `fs/path` consumer.
- Chosen fix: moved the test to `commonCore.js`, pointed `src/core/build/copy-cloud.js` straight at `commonCore.js`, and removed the dead core wrapper modules.
- Next-time guidance: when a wrapper is only preserving shape, inspect both source and test imports before keeping it around.
