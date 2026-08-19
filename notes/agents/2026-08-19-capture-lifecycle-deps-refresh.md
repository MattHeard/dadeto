# Capture-lifecycle dependencies mutation refresh

- Unexpected hurdle: the first scan used a guessed test path, matched no tests, and expanded to the full 405-test suite; that run was stopped and its timeout was not treated as survivor evidence.
- Diagnosis: the actual focused test is `test/browser/inputHandlers/captureLifecycleDeps.test.js`, not a `test/core` path.
- Chosen fix: reran the bounded scan with the correct test path; no source or test change was needed because both executable mutations were already absent. Two existing configured ignored mutations remained.
- Evidence: the corrected Stryker scan executed 2 mutants in 4 seconds with 0 executable survivors and 0 timeouts; the report contained only the two configured ignored mutations. Focused Jest passed 5 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: resolve test paths with `rg --files` before launching a mutation scan; never interpret a broad fallback run as evidence about the target file.
