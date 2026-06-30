Unexpected hurdle: the initial auth-header guard fixed the crash, but it left the repo-wide coverage gate unresolved.
Diagnosis path: I used the cloud-core coverage report to identify the missing `isObject(req)` branch in `callAuthorizationGetter()`, then verified the branch-level regression in `cloud-core.branch.test.js`.
Chosen fix: normalize the getter receiver, add coverage for missing headers and callable request shapes, and add the non-admin branch test in `createVerifyAdmin`.
Next-time guidance: when a coverage gap seems unrelated to the visible bug, inspect the exact branch map before adding broader tests; that keeps the fix bounded and avoids churn.
