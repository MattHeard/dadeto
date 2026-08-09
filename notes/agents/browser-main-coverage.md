# `src/core/browser/main.js` coverage

- Unexpected hurdle: the existing coverage test used CommonJS `jest.mock` in an ESM test environment and failed before executing.
- Diagnosis: focused Jest output was `ReferenceError: require is not defined`, leaving the module at 0% coverage.
- Fix: converted all mocks to `jest.unstable_mockModule` and imported `main.js` dynamically, preserving the existing behavioral cases.
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/browser/main.coverage.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/main.js' --coverageReporters=text-summary` — 1 suite, 1 test passed; statements 64/64, branches 11/11, functions 19/19, lines 61/61.
- Next time: run the repository check, then select the next below-100% `src/core` directory from the full coverage summary.
