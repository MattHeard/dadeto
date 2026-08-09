# Core Symphony coverage

- Target: `src/core/local/symphony.js`
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/symphony.test.js test/core/local/symphony.launch-invocation.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 10 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
