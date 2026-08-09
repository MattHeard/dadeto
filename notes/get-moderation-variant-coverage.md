# Get-moderation-variant coverage

- Scope: every source file under `src/core/cloud/get-moderation-variant/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/get-moderation-variant --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/get-moderation-variant/**/*.js' --coverageReporters=text-summary`
- Result: 3 suites and 49 tests passed; statements 156/156, branches 75/75, functions 65/65, lines 152/152.
