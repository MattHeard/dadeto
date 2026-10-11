# HTTP endpoint bootstrap arity cleanup

- Unexpected hurdle: `createCloudHttpEndpoint` destructured five fields from one endpoint options record, triggering effective arity five.
- Diagnosis: callers already construct a named endpoint options value; the helper only needs to read its fields.
- Fix: use direct record reads and an explicit `undefined` check for the default region. Express app creation, middleware order, route registration, and Cloud Functions registration remain unchanged.
- Evidence: focused endpoint and caller suites passed (3 suites / 17 tests); target no-cache arity scan was warning-free; TSDoc passed. Elevated `npm run check` passed all 10 gates. Coverage: lines 23569/23569, statements 24718/24718, functions 7927/7927, branches 13274/13274 (100%). Local E2E passed 11/11, duplication found 0 clones, npm audit found 0 vulnerabilities. Cloud-only inventory fell to 9 findings in 9 files in `/tmp/parameter-bag-cloud-after-http-endpoint-bootstrap.json`.
- Next time: use the refreshed cloud inventory; the remaining high-count candidates include `generate-stats-core.js` and `hide-variant-html-core.js`.
