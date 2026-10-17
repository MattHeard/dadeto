# Optional real Zod in interpretability tests

- Unexpected hurdle: the Jest setup does not expose top-level `await`, so an asynchronous optional import cannot initialize the existing schema fixtures.
- Diagnosis: Jest evaluates this test file without top-level-await support; a synchronous `createRequire` lookup works with the current runner.
- Fix: tests load Zod v4 when installed and fall back to the local schema-builder double when unavailable. `DADETO_TEST_WITHOUT_ZOD=1` forces and verifies the dependency-free path.
- Boundary: the schema factory still accepts an injected API; no static Zod imports or production dependency changes were added.
- Evidence: focused interpretability suites passed 2 suites / 11 tests with installed Zod and with forced fallback. `npm run check` passed all 10 gates, including 11 E2E tests, 100% coverage, and zero clones. Full check log: `.tmp/optional-zod-check.log`.
- Next time: use synchronous `createRequire` in this Jest setup for optional CommonJS-compatible test dependencies; exercise both installed and forced-fallback modes.
