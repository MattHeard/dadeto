# Symphony config coverage

- Source: `src/core/local/symphony/config.js`
- Evidence: `npx jest test/core/local/symphony.config.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/config.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 3 tests passed, and statements, branches, functions, and lines are all 100%.
