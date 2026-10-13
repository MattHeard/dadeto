# Render-contents AllowEffects audit

- **Unexpected hurdle:** The render-contents entrypoint is also composed by update-variant-visibility, so the audit needed to cover both startup paths and the shared handler call edges.
- **Diagnosis:** `createRenderContentsStartup` scopes Firebase initialization and composition to a startup boundary, and passes a no-op Firebase ensure callback after initialization. Trigger registration receives that startup permission. The core entrypoint binds a fresh invocation permission for each Firestore or HTTP trigger; injected fetch, HTTP header/response, error logging, Storage save, and CDN invalidation callbacks are permission-aware. Firestore lookups remain queries under the current policy.
- **Fix:** No code change was needed; both startup compositions and the injected effect signatures were already explicit.
- **Evidence:** Focused Jest passed (5 suites, 74 tests), including render-contents and tree-visibility suites; `npm run tsdoc:check` passed. Reviewed the cloud entrypoint, startup and trigger adapters, core entrypoint, render core, and update-variant-visibility's render dependency composition.
- **Next:** Continue the lexicographic audit at `src/cloud/render-variant/index.js`, verifying that startup, trigger/HTTP handling, fetch, logging, Storage, and CDN invalidation effects all receive the appropriate startup or invocation capability.
