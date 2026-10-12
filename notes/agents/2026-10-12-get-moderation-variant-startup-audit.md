# get-moderation-variant startup effects audit

- **Finding:** Firebase initialization is already an explicit startup effect. `runGetModerationVariant` mints a startup capability and passes it to the permission-first `initializeFirebaseApp` adapter through `createFirebaseAppManager`.
- **Lifetime:** the manager's `ensureFirebaseApp` callback is consumed synchronously by `getFirestoreInstance` during startup. The resulting Firestore client, rather than the manager callback, is passed to request handlers. Startup and request capabilities are distinct.
- **Other startup effects:** middleware and route registration also use permission-first adapters. Request responses and logging receive fresh invocation capabilities.
- **Evidence:** `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand test/core/cloud/get-moderation-variant/run.test.js test/cloud/get-moderation-variant/effect-adapters.test.js` passed (2 suites, 4 tests); `npm run tsdoc:check` passed.
- **Next:** continue the lexicographic audit at `src/cloud/hide-variant-html/index.js`.
