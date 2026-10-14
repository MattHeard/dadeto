# Submit-new-page AllowEffects audit

- Hurdle: distinguish the startup token passed to runtime composition from the permission supplied to the deferred submission callback.
- Diagnosis: traced `src/cloud/submit-new-page/index.js` through startup, Firebase initialization, Express middleware/route/HTTPS registration, request-bound submission handling, Firestore persistence, and response writing.
- Findings: startup initialization and endpoint composition require startup AllowEffects. The registered request handler creates a fresh permission. `saveSubmission` accepts and forwards that request permission for the Firestore write; the response adapter also requires it. Firestore lookups and timestamp sentinel construction are queries/construction under the current policy.
- Result: no uncovered command effect found.
- Next time: continue with `src/cloud/submit-new-story/index.js` and trace the request handler through persistence and response boundaries.
- Evidence: targeted ESLint passed; `npm run build:cloud` passed during the preceding audit; `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed after source changes before this no-source-change audit (10/10 gates, all coverage metrics 100%).
