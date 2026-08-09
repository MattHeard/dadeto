# Lint coverage

- Scope: every source file under `src/core/lint/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/lint test/lint --runInBand --coverage --silent --collectCoverageFrom='src/core/lint/**/*.js' --coverageReporters=text-summary`
- Result: 2 suites and 14 tests passed; statements 96/96, branches 98/98, functions 23/23, lines 95/95.
