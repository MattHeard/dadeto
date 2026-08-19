# Google auth status mutation slice

- Unexpected hurdle: the existing tests covered only the happy-path token state and sign-in/sign-out callbacks, leaving the no-token branch, optional refresh dependency, and profile-link reset under-specified.
- Diagnosis: a forced token condition could sign users in before the callback assertion; an omitted refresh function was never exercised with a token; and sign-out display assertions did not verify the href reset.
- Chosen fix: asserted the initial signed-out state, modeled an asynchronous author UUID refresh, exercised a token-present handle without a refresh function, and asserted the profile link returns to `#` on sign-out.
- Evidence: the final Stryker scan for `src/core/browser/google-auth-status.js` instrumented 42 mutants and killed all 42 with 0 survivors and 0 timeouts; the focused Jest suite passed 2 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: test auth state transitions before and after callbacks, including optional dependencies in the state where they are actually invoked.
