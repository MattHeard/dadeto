# Browser moderation coverage

- Scope: every source file under `src/core/browser/moderation/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/browser/moderation test/core/browser/moderation --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/moderation/**/*.js' --coverageReporters=text-summary`
- Result: 2 suites and 21 tests passed; statements 69/69, branches 33/33, functions 29/29, lines 69/69.
