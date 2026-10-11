# Commons puzzle cell art arity cleanup

- Unexpected hurdle: the first full check had an unrelated 5-second timeout in `test/local/symphony.test.js`; the required direct Jest invocation also failed to load `import.meta`, so it was not a valid isolated evaluator.
- Diagnosis: the repository Jest wrapper is required for the configured ESM environment. Running the Symphony suite through `scripts/run-jest.js` passed all 23 tests, and the subsequent full gate passed.
- Fix: `puzzleCellArt` now receives a semantic role record and a bounds/fill record separately, preserving cell behavior while avoiding a seven-field destructured parameter.
- Evidence: scoped no-cache arity report `.tmp/commons-renderer-arity-after.json` is empty; focused Commons art/runtime tests passed (2 suites, 22 tests); repository-runner Symphony suite passed (1 suite, 23 tests); TSDoc passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with 0 failures, 0 clones, and 0 audit vulnerabilities. Fresh global report `.tmp/parameter-bag-global-after-commons-renderer.json` has 37 findings across 37 files, down from 38/38.
- Next time: use the repository Jest wrapper for isolated suites that depend on ESM transforms. Next target: `src/core/browser/google-auth-cache.js:107`.
