# Realtime coverage

- Scope: every source file under `src/core/realtime/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/realtime test/realtime --runInBand --coverage --silent --collectCoverageFrom='src/core/realtime/**/*.js' --coverageReporters=text-summary`
- Result: 2 suites and 9 tests passed; statements 42/42, branches 23/23, functions 15/15, lines 42/42.
