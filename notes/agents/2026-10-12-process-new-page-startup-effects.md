# Process-new-page startup effect

- Unexpected hurdle: `process-new-page` resolves a cached Firestore instance during module evaluation, and that resolver may initialize Firebase before the trigger handler exists.
- Diagnosis: traced the cloud entrypoint through `src/cloud/firestore.js` into the shared Firestore module; the module-level call was outside any explicit startup capability boundary.
- Fix: resolve the Firestore client through a permission-first cloud adapter inside `createEffectStartupBoundary`. The capability is consumed during synchronous composition; only the resolved database is captured by the registered trigger handler.
- Verification: focused Jest passed (1 suite / 2 tests); JSDoc check, lint, and non-core size check passed; full `npm run check` passed (all 10 gates, coverage, 11 local E2E tests, 0 clones, 0 npm audit vulnerabilities); cloud packaging passed.
- Next time: audit the trigger-time Firestore writes in `process-new-page` (direct snapshot updates and batch commit) and add request/trigger capability propagation through its core path.
