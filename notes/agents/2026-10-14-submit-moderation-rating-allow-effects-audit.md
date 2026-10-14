# Submit-moderation-rating AllowEffects audit

- Hurdle: the moderator-assignment fetch returns a deferred `clearAssignment` callback, so its authorization lifetime needed to be traced through the responder rather than inferred from the factory.
- Diagnosis: followed `src/cloud/submit-moderation-rating/index.js` through startup composition, HTTP registration, request-bound responder, assignment lookup, persistence, assignment clearing, and response writing.
- Findings: Firebase initialization and HTTP app/middleware/route registration use startup permission. The public HTTP handler mints a fresh request permission. Rating writes, assignment updates (including the deferred `clearAssignment` callback), and responses receive that request permission through explicit adapters. Firestore reads and timestamp/delete sentinels remain query/construction operations.
- Result: no uncovered command effect found.
- Next time: continue with `src/cloud/submit-new-page/index.js` and its request/startup call tree.
- Evidence: targeted ESLint passed; `npm run build:cloud` passed during the preceding audit; `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed before this no-source-change audit (10/10 gates, all coverage metrics 100%).
