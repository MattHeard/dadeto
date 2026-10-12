# get-author-uuid-v2 Firebase startup effect

- **Unexpected hurdle:** the first focused Jest attempt waited on the shared `/tmp/dadeto-jest-pool` lock. The recorded PID was from another isolated process namespace, so the local liveness check could not determine whether it was still active.
- **Diagnosis:** inspected the lock owner metadata and confirmed the wrapper waits before starting Jest. Left the shared lock untouched and used a repository-local `DADETO_JEST_POOL_DIR` for the retry.
- **Fix:** Firebase initialization now runs inside `createEffectStartupBoundary` through a permission-first cloud adapter. Firestore receives a no-op `ensureAppFn` after the eager initialization, so the startup manager closure and capability cannot be reached from request-time Firestore resolution.
- **Evidence:** `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand test/cloud/get-author-uuid-v2` passed (3 suites, 3 tests); `npm run tsdoc:check` passed; full `npm run check` passed (unit coverage, 11 local E2E tests, and all 10 non-test gates).
- **Next:** continue the lexicographic cloud audit at `src/cloud/get-moderation-variant/index.js`, checking whether its existing startup adapters cover every Firebase initialization path and whether the request boundary retains any startup token.
