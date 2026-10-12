# mark-variant-dirty startup effects

- **Unexpected hurdle:** the shared `createFirebaseAppContext` helper initializes Firebase through a raw callback, and the default Firestore accessor can independently invoke its own initializer.
- **Diagnosis:** followed `runMarkVariantDirty` into both helpers. The composition was registering Express middleware and the POST route directly in core as well.
- **Fix:** startup now runs through the permission boundary and a permission-first Firebase adapter. The manager is ensured before Firestore construction, which receives a no-op initializer callback. Middleware and POST registration use permission-first adapters. `createFirebaseAppContext` is no longer used on this path.
- **Evidence:** focused mark-variant-dirty tests passed (3 suites, 64 tests); `npm run tsdoc:check` passed; `npm run check` passed, including 11 local E2E tests and all 10 non-test gates; `npm run build:cloud` passed; `git diff --check` passed. Four unrelated generated `infra/` import shims were restored after packaging.
- **Next:** migrate the request-time Firestore writes (`variantRef.update` and the two author updates) behind adapters requiring a fresh request capability. The same handler still sends HTTP responses directly and that is another explicit effect follow-up.
