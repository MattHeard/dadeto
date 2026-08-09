# Non-core thin status coverage

- Target: `src/core/local/non-core-thin/status.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/non-core-thin/status.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/non-core-thin/status.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 10 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
