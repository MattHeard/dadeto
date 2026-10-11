# CDN invalidation helper arity cleanup

- Unexpected hurdle: `sendInvalidateRequest` accepted a six-field transport record alongside the AllowEffects permission and CDN path, so the lint rule counted effective arity eight.
- Diagnosis: the caller already supplies a named `sendDeps` record; only the helper's parameter destructuring made those fields look like separate positional parameters.
- Fix: keep the permission, dependency record, and path as the helper's three explicit parameters, then read the six named fields directly from the record. The permission-gated `effectFetchFn`, URL, headers, request body, and response handling are unchanged.
- Evidence: generate-stats core tests passed (1 suite / 48 tests); targeted no-cache arity scan and TSDoc passed; `npm run build:cloud` succeeded; elevated `npm run check` passed all 10 gates. Coverage: lines 23551/23551, statements 24700/24700, functions 7927/7927, branches 13271/13271 (100%). Local E2E passed 11/11, duplication found 0 clones, npm audit found 0 vulnerabilities. Cloud-only inventory fell to 13 findings in 13 files in `/tmp/parameter-bag-cloud-after-cdn-invalidation.json`.
- Next time: use the refreshed cloud inventory; the next one-finding candidate is `src/core/cloud/firestore-handle.js`.
