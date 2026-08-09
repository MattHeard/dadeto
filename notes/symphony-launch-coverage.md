# Symphony launch coverage

- Target: `src/core/local/symphony/launch.js`
- Evidence: `npx jest test/core/local/symphony.launch-invocation.test.js test/local/symphony.launch.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/launch.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 2 suites and 9 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
