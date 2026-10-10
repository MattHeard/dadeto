# Parameter bag rollout: process new page handler builder

- Unexpected hurdle: the initial unprivileged full check could not spawn child Node processes (`EPERM`); the elevated rerun completed successfully.
- Diagnosis: the last no-cache file scan finding was `buildSubmissionHandler`, which captured five injected services before creating the snapshot handler.
- Fix: staged Firestore/FieldValue dependencies first, then runtime helpers, retaining the processed-submission early return and existing downstream processing behavior.
- Evidence: focused process-new-page Jest suite passed (24 tests); scoped ESLint and `npm run tsdoc:check` passed; fresh no-cache scan reports zero findings in `process-new-page-core.js`; `npm run build:cloud` passed; elevated `npm run check` passed all 10 gates, with zero clones and zero npm audit vulnerabilities.
- Next guidance: run a fresh global parameter-bag scan and select the next concentrated file or function; do not assume this one-file rollout completes global enforcement.
