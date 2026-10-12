# Render contents AllowEffects audit

- **Unexpected hurdle:** The focused Jest run buffered output for most of its runtime, so there was no incremental shard feedback while the selected suites executed.
- **Diagnosis:** The same Jest process remained active; waiting on that process produced the terminal result without restarting the audit.
- **Fix:** No code change was needed. Firebase initialization and both trigger registrations receive startup-scoped permission. Trigger and HTTP handlers bind fresh invocation permissions; core uses permission-first fetch, CDN invalidation, response, logging, and storage-write adapters. Firestore operations in this path are reads.
- **Evidence:** Focused Jest passed (5 suites / 74 tests); `npm run tsdoc:check` passed. Full `npm run check` (10/10 gates) and `npm run build:cloud` passed for the unchanged code state in commit `deed7208bb`.
- **Next:** Continue the lexicographic source-cloud audit at `src/cloud/render-variant/index.js`.
