# `src/core/browser/beta.js` coverage

- Existing focused tests cover the beta article reveal helper completely.
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/browser/revealBetaArticles.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/beta.js' --coverageReporters=text-summary` — 1 suite, 3 tests passed; statements 5/5, branches 2/2, functions 2/2, lines 5/5.
