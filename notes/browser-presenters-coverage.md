# Browser presenters coverage

- Scope: every source file under `src/core/browser/presenters/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/presenters test/browser/presenters test/core/browser/presenters test/browser/handleDropdownChange.presenterUsage.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/presenters/**/*.js' --coverageReporters=text-summary`
- Result: 21 suites and 113 tests passed; statements 825/825, branches 177/177, functions 263/263, lines 808/808.
