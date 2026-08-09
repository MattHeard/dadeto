# Generate-stats coverage

- Scope: every source file under `src/core/cloud/generate-stats/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/generate-stats --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/generate-stats/**/*.js' --coverageReporters=text-summary`
- Result: 6 suites and 60 tests passed; statements 260/260, branches 98/98, functions 96/96, lines 253/253.
