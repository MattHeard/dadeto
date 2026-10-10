# API key credit V1 response effects

- Unexpected hurdle: an older branch-coverage suite invoked the Express handler directly and did not provide the newly required response adapters or permission.
- Diagnosis: the first focused run covered the main handler tests but not `test/core/cloud/get-api-key-credit-core.branch.test.js`; the full check exposed the stale call site.
- Chosen fix: update that branch suite to inject the response adapters and pass a capability, then rerun the full check.
- Next-time guidance: search all tests and callers of an exported handler when tightening a core signature; targeted suites can miss parallel legacy coverage tests.
- Evidence: `TMPDIR=/home/matt/dadeto/.tmp/check-tmp npm run check` passed all 10 repository gates and its test/coverage group; `.tmp/npm-check-api-key-credit-v1-effects-final.log`. `npm run build:cloud`, `npm run lint`, and `npm run tsdoc:check` passed.
