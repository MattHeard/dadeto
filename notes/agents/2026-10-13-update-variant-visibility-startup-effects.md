# Update-variant-visibility startup effects

- **Unexpected hurdle:** The cloud packaging command rewrote four tracked shared shims unrelated to this entrypoint.
- **Diagnosis:** `npm run build:cloud` regenerates the broader cloud-function tree and also updates shared generated auth/check-suite files. The changes were confined to `infra/commonCore.js`, `infra/contentsGoogleAuthModule.js`, `infra/statsGoogleAuthModule.js`, and `infra/variantGoogleSignIn.js`.
- **Fix:** Kept the source migration scoped to update-variant-visibility and restored those four build-only shim changes. The cloud package still contains the generated update-variant-visibility files.
- **Evidence:** Focused tests passed (6 suites, 49 tests); `npm run tsdoc:check` passed; `npm run check` passed all 10 gates including coverage and local E2E; `npm run build:cloud` passed; every generated JavaScript file under `infra/cloud-functions/update-variant-visibility` passed `node --check`; `git diff --check` passed.
- **Next:** Continue the Allow Effects audit from the next source-cloud entrypoint with an unguarded injected command effect. Keep the startup permission scoped to synchronous composition and pass fresh invocation permissions to registered handlers.
