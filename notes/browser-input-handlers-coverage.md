# Browser input handlers coverage

- Scope: every source file under `src/core/browser/inputHandlers/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/browser/inputHandlers test/core/browser/inputHandlers test/inputHandlers test/browser/escapeKey.test.js test/browser/sharedSpecialInput.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/inputHandlers/**/*.js' --coverageReporters=text-summary`
- Result: 30 suites and 191 tests passed; statements 1357/1357, branches 374/374, functions 484/484, lines 1314/1314.
