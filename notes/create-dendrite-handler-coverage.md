# Dendrite handler coverage

- Target: `src/core/browser/inputHandlers/createDendriteHandler.js`
- Evidence: `npx jest test/core/browser/inputHandlers/createDendriteHandler.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/inputHandlers/createDendriteHandler.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 13 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
