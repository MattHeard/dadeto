# Submit-new-page coverage

- Scope: every source file under `src/core/cloud/submit-new-page/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/submit-new-page --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/submit-new-page/**/*.js' --coverageReporters=text-summary`
- Result: 4 suites and 23 tests passed; statements 136/136, branches 52/52, functions 53/53, lines 134/134.
- Added the missing `jest` import in `helpers.test.js` for native module mode.
