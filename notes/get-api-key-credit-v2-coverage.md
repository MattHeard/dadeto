# Get-api-key-credit-v2 coverage

- Scope: every source file under `src/core/cloud/get-api-key-credit-v2/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/get-api-key-credit-v2 --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/get-api-key-credit-v2/**/*.js' --coverageReporters=text-summary`
- Result: 3 suites and 62 tests passed; statements 191/191, branches 106/106, functions 78/78, lines 185/185.
