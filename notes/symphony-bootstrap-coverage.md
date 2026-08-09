# Symphony bootstrap coverage

- Target: `src/core/local/symphony/bootstrap.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/symphony.bootstrap-handle.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/bootstrap.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 8 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
