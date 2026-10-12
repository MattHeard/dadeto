# hide-variant-html Firebase startup effect

- **Unexpected hurdle:** the cloud packaging smoke rewrote four generated import shims under `infra/` that were unrelated to this endpoint.
- **Diagnosis:** checked the post-build worktree and identified only `infra/commonCore.js`, `infra/contentsGoogleAuthModule.js`, `infra/statsGoogleAuthModule.js`, and `infra/variantGoogleSignIn.js` as collateral output.
- **Fix:** restored those generated shims. Firebase initialization and Firestore construction now run inside a synchronous startup boundary in the cloud entrypoint, using the permission-first adapter and initialize-once manager. The Firestore resolver receives a no-op app callback after initialization. Removed the raw initializer dependency from core.
- **Evidence:** focused `test/cloud/hide-variant-html` and `test/core/cloud/hide-variant-html` passed (6 suites, 47 tests); `npm run check` passed, including all 11 local E2E tests and all 10 non-test gates; `npm run build:cloud` passed; `git diff --check` passed.
- **Next:** continue the lexicographic audit at `src/cloud/mark-variant-dirty/index.js`.
