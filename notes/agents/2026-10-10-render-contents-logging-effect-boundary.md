# Render-contents logging effect boundary

- **Unexpected hurdle:** The first aggregate check found two branch tests coupled to the implicit `console.error` fallback that the new effect boundary removes.
- **Diagnosis:** The invalidation workflow passed the CDN operation's permission through promise callbacks to reach its logger. The parameter-rule correctly identified that as a captured capability, and TSDoc also showed the normalized optional type needed a required boundary cast.
- **Fix:** Make `logError` a required permission-first dependency for render-contents. Pass the invalidation permission to logging from the same async function that awaits the POST, and provide cloud and simulator adapters. Remove the unpermissioned core fallback and its obsolete tests. Add tests that assert the adapter receives the CDN operation's permission.
- **Evidence:** Six focused suites / 79 tests passed; lint, TSDoc, and cloud packaging passed. Elevated `npm run check` passed all 10 gates, all four coverage metrics at 100%, 11/11 local E2E, zero clones, and zero vulnerabilities. Full log: `.tmp/npm-check-render-contents-logging-effects-final.log`.
- **Next time:** When a permission-first async operation also logs, await it and invoke the logger directly with the same permission; do not capture the permission in a `.then()` callback.
