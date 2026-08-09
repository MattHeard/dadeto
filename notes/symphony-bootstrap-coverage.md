# Symphony bootstrap coverage

- Source: `src/core/local/symphony/bootstrap.js`
- Evidence: `npx jest test/core/local/symphony.bootstrap-handle.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/bootstrap.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 8 tests passed, and statements, branches, functions, and lines are all 100%.
