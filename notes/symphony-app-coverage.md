# Symphony app coverage

- Source: `src/core/local/symphony/app.js`
- Evidence: `npx jest test/local/symphony.app.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/app.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite passed, 15 tests passed, and statements, branches, functions, and lines are all 100%.
