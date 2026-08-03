# Check scheduling

- Unexpected hurdle: the original all-at-once check launch made the coverage-heavy test gate compete with static checks and eventually timed out.
- Diagnosis: `src/local/run-check.js` launched every check concurrently, while the test runner already has substantial peak memory use.
- Fix: run the test gate first, then run the remaining quality gates concurrently; add focused tests for ordering and fail-fast behavior.
- Next-time guidance: benchmark with the repository's real machine limits and keep the scheduler isolated from generated Playwright artifacts.
