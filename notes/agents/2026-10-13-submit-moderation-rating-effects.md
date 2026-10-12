# Submit moderation rating AllowEffects migration

- **Unexpected hurdle:** The initial full check found an old report-for-moderation coverage fixture that still supplied the previous unguarded endpoint adapters. The first implementation also exceeded the repository's duplication and non-core-thin gates.
- **Diagnosis:** The report test needed to mirror the new permission-first HTTP registration contract. The shared endpoint registration and responder normalization were duplicated between cloud handlers, while keeping Firestore write adapters in the main adapter module crossed the file-size limit.
- **Fix:** Added a shared cloud HTTP endpoint adapter and shared responder normalization, split Firestore write adapters from response adapters, and updated the old fixture to pass the new boundary functions. Submit moderation now initializes Firebase during scoped startup, binds per-request capabilities for database writes and responses, and uses a no-op Firestore initializer after startup.
- **Evidence:** `npm run check` passed all 10 gates, including unit coverage, 11 local E2E tests, zero duplication clones, and audit; `npm run build:cloud` passed; generated submit-moderation-rating and shared endpoint JavaScript copies passed `node --check`; `git diff --check` passed.
- **Next:** Continue the Notion Specs rank-1 source-cloud audit at `src/cloud/render-author/index.js`.
