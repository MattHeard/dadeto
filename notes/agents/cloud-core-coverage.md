# Cloud-core coverage

- Unexpected hurdle: the existing cloud-core tests covered the primary helpers but left Firebase trigger callbacks, environment fallbacks, token parsing, CORS dispatch, and dependency guards uncovered.
- Diagnosis: focused Jest coverage reported 80.26% statements, 80.67% branches, 71.42% functions, and 80% lines, with uncovered ranges including 84-97, 121-125, 157, 182, 252, 257, 280, 458-462, 503-525, 595-608, 646, 664, 713-781, and 867-871.
- Fix: added direct tests for those public paths and their observable callbacks, including success and error cases.
- Evidence: focused Jest run with `cloud-core.test.js`, `cloud-core.branch.test.js`, and `cloud-core.coverage.additional.test.js` reports 60 tests passed and 100% statements/branches/functions/lines for `src/core/cloud/cloud-core.js`.
- Next time: use the uncovered-line report to group related exported helpers and cover callback/error branches in the same focused test file.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/cloud-core.branch.test.js test/core/cloud/cloud-core.coverage.additional.test.js test/core/cloud/cloud-core.test.js --runInBand --coverage --silent --coverageDirectory=/tmp/dadeto-cloudcore-cov --collectCoverageFrom='src/core/cloud/cloud-core.js' --coverageReporters=json --coverageReporters=text-summary` — 3 suites, 60 tests passed; statements 223/223, branches 119/119, functions 77/77, lines 220/220.
