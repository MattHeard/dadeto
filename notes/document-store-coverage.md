# Document store coverage

- Source: `src/core/local/documentStore.js`
- Added tests for non-empty and blank document saves, draft appending and pruning, empty legacy bootstrap, and the default clock.
- Evidence: `npx jest test/core/local/documentStore.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/documentStore.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 24 tests passed, and statements, branches, functions, and lines are all 100%.
