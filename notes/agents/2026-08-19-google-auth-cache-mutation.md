# Google-auth cache mutation slice

- Unexpected hurdle: the persisted report listed 13 survivors, but the fresh file scan showed 13 executable survivors before testing and one configured static constant mutation after the assertions were added.
- Diagnosis: tests covered outcomes but not the exact storage key, request headers, non-OK short-circuit, malformed UUID payloads, empty-value clearing, or null sign-in options.
- Chosen fix: added focused assertions for each observable input distinction without adding exemptions or ignore pragmas.
- Evidence: the final Stryker scan for `src/core/browser/google-auth-cache.js` executed 57 mutants; all 56 executable mutants were killed with 0 executable survivors and 0 timeouts. One static module-constant mutation remains ignored by the existing `ignoreStatic` configuration. Focused Jest passed 8 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: distinguish configured static mutations from executable survivors when interpreting Stryker reports; assert protocol details such as storage keys and request headers directly.
