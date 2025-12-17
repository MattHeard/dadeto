## Cloud core coverage

- The `cloud-core` coverage was stuck at 99.31% because `getHeaderFromGetter` never executed the early return branch when the getter wasn’t callable; the line that returns `null` behaved as if it never existed.
- I added a small test in `test/core/cloud/cloud-core.test.js` that calls `getHeaderFromGetter(undefined, 'Authorization')`, which walks through the false branch and brings that single line under test so the module now hits 100%.
- Because coverage instrumentation is eager, the test is lightweight and only touches the exporter; if similar gaps appear in other shared helpers, look for missing early returns in `cloud-core.js` as likely suspects.
