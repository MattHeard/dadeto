# Error beacon handler arity cleanup

- Unexpected hurdle: the error handler mixed event construction dependencies, response adapters, and the console logger in one destructured factory argument, triggering the parameter-bag arity rule.
- Diagnosis: a fresh no-cache, per-file ESLint scan showed one finding in `createErrorBeaconHandler` (syntactic arity 1, effective arity 9).
- Fix: split the existing cohesive dependencies into event, response, and logger stages. The handler still receives `AllowEffects` at request time, and event reporting, response behavior, and error logging remain unchanged.
- Evidence: focused error-beacon suites passed (28 tests); TSDoc and the per-file arity scan passed. `npm run check` passed all 10 gates, including 100% lines/statements/functions/branches, 11/11 local browser tests, zero clones, and zero audit vulnerabilities. Cloud-only inventory fell from 16 findings in 16 files to 15 in 15 files; the next one-finding candidate is `src/core/cloud/firebase-app-manager.js`.
- Next time: refresh the cloud inventory before selecting a file, and inspect the current bead contract because its issue description can lag behind the loop recorded in comments.
