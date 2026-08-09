# Non-core-thin coverage

- Scope: every source file under `src/core/local/non-core-thin/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/non-core-thin test/local/non-core-thin --runInBand --coverage --silent --collectCoverageFrom='src/core/local/non-core-thin/**/*.js' --coverageReporters=text-summary`
- Result: 2 suites and 11 tests passed; statements 83/83, branches 41/41, functions 34/34, lines 82/82.
