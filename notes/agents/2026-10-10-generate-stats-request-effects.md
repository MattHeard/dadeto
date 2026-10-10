# Generate-stats request effects

- Unexpected hurdle: the request handler wrote responses and diagnostics directly, so adding the capability at the request boundary required threading it through several adapters and updating direct core callers.
- Diagnosis: focused tests and the aggregate check found two preserved-behavior issues (UUID setup failures must retain the skip-invalidation log path and direct simulator callers need the new permission-first signature), then coverage identified uncovered auth and simulator adapter branches.
- Chosen fix: route request responses and warning/error logs through permission-first adapters, mint a fresh capability per registered HTTP request, keep each CDN request and its failure log in the same boundary, and cover body-token/verification-error/logging paths.
- Next-time guidance: when changing an injected request API, search for direct core and simulator callers as well as cloud wrappers; use the aggregate coverage report to identify any branches moved into a new core path.
- Evidence: targeted generate-stats suites passed (69 tests across the core/branch/simulator suites); `npm run build:cloud`, `npm run tsdoc:check`, touched-file ESLint, and the final `npm run check` passed. Aggregate coverage summary: `reports/coverage/coverage-summary.json` reports 100% lines, statements, functions, and branches.
- Follow-up: parser setup and Firebase initialization are outside this loop and remain with `dadeto-xqou`.
