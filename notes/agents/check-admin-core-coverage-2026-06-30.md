Unexpected hurdle: `npm run check` stayed red on repo-wide coverage even after the initial admin-core fix.

Diagnosis: the missing line was in `src/core/browser/admin-core.js` around the `initAdminApp` Google sign-in branch, and the first test only exercised the bootstrap wrapper, not the exact disablement path.

Chosen fix: added a focused coverage test in `test/core/browser/admin/admin-core.coverage.test.js` that boots admin app handlers and calls `initGoogleSignIn()` with `disableGoogleSignIn` set.

Next time: when coverage barely misses the global threshold, check the exact uncovered line in the report and target the specific exported path, not just the surrounding wrapper.
