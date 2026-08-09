# Browser JSON utilities coverage

- Target: `src/core/browser/jsonUtils.js`
- Evidence: `npx jest test/core/browser/jsonUtils.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/jsonUtils.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 1 test passed; statements, branches, functions, and lines each reached 100% without exclusions.
