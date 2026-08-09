# Assign-moderation-job coverage

- Scope: every source file under `src/core/cloud/assign-moderation-job/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/assign-moderation-job --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/assign-moderation-job/**/*.js' --coverageReporters=text-summary`
- Result: 3 suites and 27 tests passed; statements 310/310, branches 119/119, functions 125/125, lines 310/310.
