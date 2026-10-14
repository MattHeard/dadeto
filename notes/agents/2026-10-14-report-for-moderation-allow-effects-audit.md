# Report-for-moderation AllowEffects audit

- Hurdle: verify each composition and request-time operation separately so a startup capability is not mistaken for authorization of later HTTP effects.
- Diagnosis: traced `src/cloud/report-for-moderation/index.js` through startup composition, `runReportForModeration`, the generic HTTP endpoint adapter, the report handler, and response/write adapters.
- Findings: Firebase initialization, Express middleware/route setup, and HTTPS registration use the startup capability. The registered handler is wrapped in a fresh per-request HTTP boundary. Report persistence and response writes receive that request capability through `addModerationReport` and `sendReportResponse`. Duplicate-report Firestore reads and `FieldValue.serverTimestamp()` sentinel construction remain query/construction operations under the current classification.
- Result: no uncovered command effect found; the report-for-moderation handoff is complete.
- Next time: continue the source-cloud audit with `src/cloud/submit-moderation-rating/index.js`, preserving the startup/request lifetime split.
- Evidence: targeted ESLint passed; `npm run build:cloud` passed during the preceding audit; `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed immediately before this no-source-change audit (10/10 gates, all coverage metrics 100%).
