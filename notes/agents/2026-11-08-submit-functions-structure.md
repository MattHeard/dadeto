# Submit Function Standardization

## Summary
- Brought the submit-moderation-rating, submit-new-page, and submit-new-story Cloud Functions onto the shared core/GCF bridge pattern.
- Added dedicated Jest suites for the new core responders to lock in authentication, normalization, and CORS behaviour.
- Extended the copy script so deployment bundles stage the new core modules, helpers, and shared shims for each function.

## Challenges & Resolutions
- **Authorization handling drift**: submit-moderation-rating mixed Firestore reads and auth checks inside the Express layer. I extracted a pure responder that accepts explicit dependencies, added unit coverage, and wired Express through the adapter to preserve behaviour.
- **Core helper relocation**: submit-new-page still hosted its helpers in the cloud layer. Moving them into `src/core/cloud` required updating imports, the copy pipeline, and the legacy tests. I added re-export bridges and copy targets so infra packaging resolves the new paths.
- **CORS parity for submit-new-story**: the function previously embedded a bespoke middleware for CORS errors. I codified that as `createCorsErrorHandler`, covered it in tests, and re-used it from the entry module to keep behaviour identical.
