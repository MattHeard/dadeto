# Firebase Admin initialization requires AllowEffects

- **Unexpected hurdle:** The first full `npm run check` run reported the update-variant-visibility startup dependency file at 51 lines against the 50-line non-core limit, although `wc -l` reported 50.
- **Diagnosis:** The checker counts the final newline as a line. A wrapped dependency declaration could be collapsed without changing behavior.
- **Fix:** Firebase initialization and Firestore startup APIs now require and forward `AllowEffects`; cloud adapters discard the permission only at the Firebase SDK boundary. Startup capabilities are not retained in request handlers. The long startup dependency declaration was collapsed to satisfy the file limit.
- **Evidence:** `npm run check` passed all 10 gates; `npm run build:cloud` exited 0; `git diff --check` passed; focused Firebase/Firestore and affected cloud suites passed earlier in this loop.
- **Next:** Continue the source-cloud AllowEffects audit at the next uncovered injected effect boundary. Keep permission minting at each cloud startup/invocation boundary and avoid retaining startup capabilities.
