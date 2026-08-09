# Get-author-uuid-v2 coverage

- Scope: every source file under `src/core/cloud/get-author-uuid-v2/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/get-author-uuid-v2 --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/get-author-uuid-v2/**/*.js' --coverageReporters=text-summary`
- Result: 1 suite and 5 tests passed; statements 20/20, branches 7/7, functions 6/6, lines 20/20.
