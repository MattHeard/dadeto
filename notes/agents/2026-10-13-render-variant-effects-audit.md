# Render-variant AllowEffects audit

- **Unexpected hurdle:** Render-variant contains a `fetch` call in core, so the audit had to distinguish server-side injected transport from script text emitted into rendered pages.
- **Diagnosis:** `buildReportHtml` emits the report `fetch` as browser JavaScript; it does not execute in the Cloud Function. Server-side injected `fetchFn`, CDN invalidation fetch, storage writes, Firestore updates, and recoverable error logging all use permission-aware adapters. Trigger and tree-regeneration registration use startup permission, while trigger, scheduled, and HTTP execution paths bind invocation permissions for writes, logs, and responses. Firestore reads remain queries.
- **Fix:** No code change was needed; review confirmed the prior logger and tree-visibility migrations cover the live paths without capturing startup capability.
- **Evidence:** Focused Jest passed (12 suites, 149 tests); `npm run tsdoc:check` and `git diff --check` passed. Reviewed the cloud index/startup adapters, core run/render flow, generated report script, and tree-visibility runner/handlers.
- **Next:** The next open backlog item is Billing protocol hardening. Resolve its remaining acceptance gaps from the current Notion spec, beginning with refund-to-intent matching, deferred-event replay, and raw-body-only webhook handling.
