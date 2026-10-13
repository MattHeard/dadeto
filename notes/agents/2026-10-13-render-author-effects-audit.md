# Render-author AllowEffects audit

- **Unexpected hurdle:** The active handoff described render-author as the next audit target, but the current implementation already had permission-aware adapters, so the question was whether any effects were still hidden behind the injected core path.
- **Diagnosis:** `runRenderAuthor` passes the startup permission to trigger registration. The registered callback binds a fresh invocation boundary, and `createRenderAuthorHandler` forwards that permission to the Storage save and author document update adapters. Moderator and author variant Firestore reads are query operations under the spec and remain outside the command boundary.
- **Fix:** No code migration was needed; source review confirmed the existing capability flow and read/write classification.
- **Evidence:** Focused Jest passed (6 suites, 21 tests); `npm run tsdoc:check` passed. Reviewed `src/cloud/render-author/index.js`, `src/core/cloud/render-author/run.js`, `src/core/cloud/render-author/render-author-core.js`, and the cloud effect/trigger adapters.
- **Next:** Continue the lexicographic source-cloud audit at `src/cloud/render-contents/index.js`, checking trigger/startup registration and its injected core call tree for any remaining command effect without a permission-first adapter.
