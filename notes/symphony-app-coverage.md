# Symphony app coverage

- Target: `src/core/local/symphony/app.js`
- Evidence: `npx jest test/local/symphony.app.test.js --runInBand --coverage --collectCoverageFrom=src/core/local/symphony/app.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 15 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
