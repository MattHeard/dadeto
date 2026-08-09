# Get-api-key-credit coverage

- Scope: every source file under `src/core/cloud/get-api-key-credit/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/get-api-key-credit --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/get-api-key-credit/**/*.js' --coverageReporters=text-summary`
- Result: 8 suites and 94 tests passed; statements 85/85, branches 34/34, functions 24/24, lines 84/84.
