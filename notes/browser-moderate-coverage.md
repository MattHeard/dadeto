# Browser moderate coverage

- Target: `src/core/browser/moderate.js`
- Evidence: `npx jest test/core/browser/moderate.test.js test/core/browser/moderate.coverage.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/moderate.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 2 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
