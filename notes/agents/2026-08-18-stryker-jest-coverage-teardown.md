# 2026-08-18: Stryker Jest coverage teardown

- Unexpected hurdle: focused Stryker runs spent about a minute per mutant even though the normal Jest suite completed in seconds.
- Diagnosis path: ran the same browser-core test with `STRYKER_TEST_ENV=1` and found Jest collecting every `src/core` file and enforcing the global coverage threshold for each focused mutation run.
- Chosen fix: disable Jest-wide coverage and forced coverage matching in Stryker mode because Stryker already performs per-test coverage analysis; retain normal coverage behavior outside Stryker.
- Next-time guidance: verify Stryker-mode Jest startup separately before attributing slow mutant execution to application code.
