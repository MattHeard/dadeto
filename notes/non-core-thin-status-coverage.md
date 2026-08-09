# Non-core thin status coverage

- Source: `src/core/local/non-core-thin/status.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/non-core-thin/status.test.js test/core/local/non-core-thin/status.branch.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/non-core-thin/status.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites passed, 10 tests passed, and statements, branches, functions, and lines are all 100%.
